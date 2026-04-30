'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bookmark,
  Coins,
  Download,
  Loader2,
  Mic,
  MicVocal,
  Pause,
  Pencil,
  Play,
  Speech,
  Square,
  Trash2,
  Type,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { idbDelete, idbLoad, idbSave } from '@/lib/panel-idb';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api, ApiError, VoiceProfile } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { useGenerationRecovery } from '@/lib/use-generation-recovery';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';
type Mode = 'tts' | 'clone';

interface ReferenceAudio {
  base64: string;
  mime_type: string;
  durationSeconds?: number;
}

const MAX_TEXT_LENGTH = 2000;
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const TTS_CREDIT_COST = 10;
const CLONE_CREDIT_COST = 15;

const VOICE_OPTIONS = [
  { value: 'ana-pt', label: 'Ana (PT) — Feminina' },
  { value: 'carlos-pt', label: 'Carlos (PT) — Masculina' },
  { value: 'sofia-pt', label: 'Sofia (PT) — Feminina jovem' },
  { value: 'rafael-pt', label: 'Rafael (PT) — Masculina jovem' },
  { value: 'emma-en', label: 'Emma (EN) — Feminina' },
  { value: 'james-en', label: 'James (EN) — Masculina' },
  { value: 'lucia-es', label: 'Lucía (ES) — Feminina' },
  { value: 'diego-es', label: 'Diego (ES) — Masculina' },
];

const LANGUAGE_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
];

const SPEED_OPTIONS = [
  { value: '0.75', label: '0.75×' },
  { value: '1', label: '1×' },
  { value: '1.25', label: '1.25×' },
  { value: '1.5', label: '1.5×' },
];

// ─── component ────────────────────────────────────────────────────────────────

interface GenerateAudioPanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function GenerateAudioPanel({ nodeId, onClose, onDuplicate }: GenerateAudioPanelProps) {
  const {
    consumeCredits,
    refetchCredits,
    prependToGallery,
    setNodeGenerating,
  } = useEditor();
  const { accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const storageKey = `geraew-panel-audio-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState<Mode>(stored?.mode ?? 'tts');
  const [text, setText] = useState<string>(stored?.text ?? '');
  const [voiceId, setVoiceId] = useState<string>(stored?.voiceId ?? VOICE_OPTIONS[0].value);
  const [language, setLanguage] = useState<string>(stored?.language ?? 'pt');
  const [speed, setSpeed] = useState<string>(stored?.speed ?? '1');
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(stored?.generatedAudioUrl ?? null);
  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedAudioUrl
        ? 'done'
        : 'idle',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const [referenceAudio, setReferenceAudio] = useState<ReferenceAudio | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Saved voice profiles (from /voices)
  const [savedVoices, setSavedVoices] = useState<VoiceProfile[]>([]);
  const [voiceQuotaLimit, setVoiceQuotaLimit] = useState<number>(0);
  const [savingVoice, setSavingVoice] = useState(false);
  const [showSaveVoiceForm, setShowSaveVoiceForm] = useState(false);
  const [saveVoiceName, setSaveVoiceName] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    setNodeGenerating(nodeId, genState === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [genState, nodeId, setNodeGenerating]);

  // Persist form state
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          mode,
          text,
          voiceId,
          language,
          speed,
          generatedAudioUrl,
          generationId,
          genState,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [storageKey, mode, text, voiceId, language, speed, generatedAudioUrl, generationId, genState]);

  // Load reference audio from IndexedDB on mount
  useEffect(() => {
    idbLoad<ReferenceAudio>(`${storageKey}-audio`)
      .then((audio) => {
        if (audio) setReferenceAudio(audio);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save reference audio to IndexedDB
  useEffect(() => {
    if (referenceAudio) {
      idbSave(`${storageKey}-audio`, referenceAudio).catch(() => { });
    }
  }, [storageKey, referenceAudio]);

  // Load saved voice profiles
  useEffect(() => {
    if (!accessToken) return;
    api.voices
      .list(accessToken)
      .then((res) => {
        setSavedVoices(res.voices);
        setVoiceQuotaLimit(res.quota.limit);
        // Fallback: persisted voiceId points to a voice that no longer exists
        if (voiceId.startsWith('clone:')) {
          const id = voiceId.slice('clone:'.length);
          if (!res.voices.some((v) => v.id === id)) {
            setVoiceId(VOICE_OPTIONS[0].value);
          }
        }
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);


  // Resume in-progress generation
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (stored?.genState === 'generating' && stored?.generationId && accessToken) {
      resumedRef.current = true;
      startProgressAnimation(70);
      startPollingFallback(stored.generationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useGenerationRecovery(generationId, accessToken, genState === 'generating', {
    onCompleted: (gen) => {
      finishWithAudio(gen.outputs[0].url, gen.id);
      refetchCredits();
      prependToGallery(gen);
    },
    onFailed: (gen) => {
      cleanupGeneration();
      setGenState('idle');
      setErrorMsg(
        showGenerationError({
          errorMessage: gen.errorMessage,
          fallback: 'Não foi possível gerar o áudio. Tente novamente em alguns instantes.',
        }),
      );
      refetchCredits();
    },
  });

  // Cleanup on unmount
  useEffect(
    () => () => {
      cleanupGeneration();
      stopRecording();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Block wheel events from reaching ReactFlow when scrolling inside form fields
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') {
        e.stopPropagation();
      }
    };
    panel.addEventListener('wheel', onWheel, { capture: true });
    return () => panel.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  // ─── helpers ──────────────────────────────────────────────────────────────

  function cleanupGeneration() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (sseControllerRef.current) {
      sseControllerRef.current.abort();
      sseControllerRef.current = null;
    }
  }

  function startProgressAnimation(from = 0) {
    let current = from;
    setProgress(from);
    progressIntervalRef.current = setInterval(() => {
      const remaining = 90 - current;
      const step = Math.max(0.3, Math.random() * (remaining * 0.05 + 0.5));
      current = Math.min(90, current + step);
      setProgress(Math.round(current));
    }, 600);
  }

  function finishWithAudio(url: string, genId?: string) {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    cleanupGeneration();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedAudioUrl(url);
      if (genId) setGenerationId(genId);
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        if (!accessToken) return;
        const generation = await api.generations.get(accessToken, id);
        if (generation.status === 'COMPLETED' && generation.outputs?.[0]) {
          finishWithAudio(generation.outputs[0].url, id);
          refetchCredits();
          prependToGallery(generation);
        }
        if (generation.status === 'FAILED') {
          cleanupGeneration();
          setGenState('idle');
          setErrorMsg(
            showGenerationError({
              errorMessage: generation.errorMessage,
              fallback: 'Não foi possível gerar o áudio. Tente novamente em alguns instantes.',
            }),
          );
          refetchCredits();
        }
      } catch {
        cleanupGeneration();
        setGenState('idle');
        setErrorMsg(
          showGenerationError({
            fallback: 'Perdemos a conexão ao verificar o status. Recarregue para ver o resultado.',
          }),
        );
      }
    }, 3000);
  }

  // ─── reference audio ─────────────────────────────────────────────────────

  function handleAudioFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      toast.error('Esse arquivo não parece áudio. Use mp3, wav, ogg ou webm.');
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Áudio acima de 15 MB. Use um arquivo mais curto ou comprima antes.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setReferenceAudio({ base64, mime_type: file.type });
      toast.success('Áudio de referência adicionado.');
    };
    reader.readAsDataURL(file);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const base64 = dataUrl.split(',')[1];
          setReferenceAudio({
            base64,
            mime_type: blob.type,
            durationSeconds: recordSeconds,
          });
          toast.success('Gravação salva.');
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
      // Defer to next frame so the canvas is mounted (it's conditionally rendered)
      requestAnimationFrame(() => startVisualizer(stream));
    } catch {
      toast.error('Não conseguimos acessar o microfone. Verifique as permissões do navegador.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    stopVisualizer();
    setIsRecording(false);
  }

  function clearReferenceAudio() {
    setReferenceAudio(null);
    idbDelete(`${storageKey}-audio`).catch(() => { });
  }

  function startVisualizer(stream: MediaStream) {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    ctx.scale(dpr, dpr);

    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor =
      window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctor) return;
    const audioCtx = new Ctor();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.75;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const barCount = 22;
    const barGap = 2;

    const draw = () => {
      analyser.getByteFrequencyData(buffer);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const totalGap = barGap * (barCount - 1);
      const barWidth = (rect.width - totalGap) / barCount;

      ctx.fillStyle = '#a2dd00';
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * buffer.length);
        const value = buffer[idx] / 255;
        const barHeight = Math.max(2, value * rect.height);
        const x = i * (barWidth + barGap);
        const y = (rect.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }

  function stopVisualizer() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => { });
      audioCtxRef.current = null;
    }
  }

  // ─── saved voices ────────────────────────────────────────────────────────

  async function handleSaveVoice() {
    if (!accessToken || !generationId) return;
    const trimmed = saveVoiceName.trim();
    if (!trimmed) {
      toast.error('Dê um nome para a voz antes de salvar.');
      return;
    }
    setSavingVoice(true);
    try {
      const voice = await api.voices.create(accessToken, {
        generationId,
        name: trimmed,
      });
      setSavedVoices((prev) => [voice, ...prev]);
      setShowSaveVoiceForm(false);
      setSaveVoiceName('');
      toast.success(`Voz "${voice.name}" salva.`);
      // Switch to TTS mode pre-selecting the new voice for immediate reuse
      setMode('tts');
      setVoiceId(`clone:${voice.id}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não conseguimos salvar a voz agora. Tente novamente.';
      toast.error(msg);
    } finally {
      setSavingVoice(false);
    }
  }

  async function handleRenameSavedVoice(voice: VoiceProfile, newName: string) {
    if (!accessToken) return;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === voice.name) return;
    try {
      const updated = await api.voices.rename(accessToken, voice.id, trimmed);
      setSavedVoices((prev) => prev.map((v) => (v.id === voice.id ? updated : v)));
      toast.success('Voz renomeada.');
    } catch {
      toast.error('Não conseguimos renomear a voz. Tente de novo.');
    }
  }

  async function handleDeleteSavedVoice(voice: VoiceProfile) {
    if (!accessToken) return;
    try {
      await api.voices.delete(accessToken, voice.id);
      setSavedVoices((prev) => prev.filter((v) => v.id !== voice.id));
      // If currently selected, fall back to the first default voice
      if (voiceId === `clone:${voice.id}`) {
        setVoiceId(VOICE_OPTIONS[0].value);
      }
      toast.success('Voz excluída.');
    } catch {
      toast.error('Não conseguimos excluir a voz agora. Tente de novo.');
    }
  }

  // ─── generation ──────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!accessToken) {
      openLoginModal();
      return;
    }

    if (!text.trim()) return;

    if (mode === 'clone' && !referenceAudio) {
      setErrorMsg('Faça upload ou grave um áudio de referência antes de clonar a voz.');
      return;
    }

    setGenState('generating');
    setProgress(0);
    setErrorMsg(null);
    setShowSaveVoiceForm(false);
    setSaveVoiceName('');
    isFinishedRef.current = false;
    cleanupGeneration();
    startProgressAnimation();

    try {
      const { id, creditsConsumed } =
        mode === 'tts'
          ? await api.generations.textToSpeech(accessToken, {
            text,
            voice_id: voiceId,
            language,
            speed: parseFloat(speed),
          })
          : await api.generations.voiceClone(accessToken, {
            text,
            audio: referenceAudio!.base64,
            audio_mime_type: referenceAudio!.mime_type,
            language,
          });

      consumeCredits(creditsConsumed);
      setGenerationId(id);

      startPollingFallback(id);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: genId, outputUrls }) => {
          finishWithAudio(outputUrls[0], genId);
          refetchCredits();
          api.generations.get(accessToken, genId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          cleanupGeneration();
          setGenState('idle');
          setErrorMsg(
            showGenerationError({
              errorMessage,
              creditsRefunded,
              fallback: 'Não foi possível gerar o áudio. Tente novamente em alguns instantes.',
            }),
          );
          refetchCredits();
        },
        onError: () => {
          // polling fallback handles it
        },
      });
    } catch (err) {
      cleanupGeneration();
      setGenState('idle');
      if (err instanceof ApiError && err.status === 429) {
        setErrorMsg(
          showGenerationError({
            errorMessage:
              'Você já tem o número máximo de gerações em andamento. Aguarde uma delas terminar e tente de novo.',
            fallback: 'Não foi possível iniciar a geração.',
          }),
        );
        return;
      }
      setErrorMsg(
        showGenerationError({
          errorMessage: err instanceof Error ? err.message : null,
          fallback: 'Não foi possível iniciar a geração. Verifique sua conexão e tente novamente.',
        }),
      );
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setGeneratedAudioUrl(null);
    setGenerationId(null);
    setErrorMsg(null);
    setShowSaveVoiceForm(false);
    setSaveVoiceName('');
  }

  async function handleDownload() {
    if (!generatedAudioUrl) return;
    try {
      const res = await fetch(generatedAudioUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'geraew-audio.mp3';
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const a = document.createElement('a');
      a.href = generatedAudioUrl;
      a.download = 'geraew-audio.mp3';
      a.click();
    }
  }

  const isGenerating = genState === 'generating';
  const creditsCost = mode === 'tts' ? TTS_CREDIT_COST : CLONE_CREDIT_COST;
  const canGenerate =
    !isGenerating && text.trim().length > 0 && (mode === 'tts' || referenceAudio !== null);

  const previewDataUrl = referenceAudio
    ? `data:${referenceAudio.mime_type};base64,${referenceAudio.base64}`
    : null;

  return (
    <TooltipProvider>
      <div
        ref={panelRef}
        className="w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.07] bg-[#1a2123] shadow-2xl shadow-black/50 sm:w-[320px]"
      >
        {/* Header */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
              GERAR ÁUDIO
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} />
            <button
              onClick={() => {
                localStorage.removeItem(storageKey);
                idbDelete(`${storageKey}-audio`).catch(() => { });
                onClose?.();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* ── Mode tabs ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <ModeTab
              icon={Type}
              label="Texto → Voz"
              hint="Voz pronta"
              active={mode === 'tts'}
              disabled={isGenerating}
              onClick={() => setMode('tts')}
            />
            <ModeTab
              icon={Speech}
              label="Clonar Voz"
              hint="Sua voz"
              active={mode === 'clone'}
              disabled={isGenerating}
              onClick={() => setMode('clone')}
            />
          </div>

          {/* ── Generating state ─────────────────────────────────────── */}
          {genState === 'generating' && (
            <div className="rounded-xl border border-[#a2dd00]/20 bg-[#1e494b]/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15">
                  <Loader2 className="h-4 w-4 animate-spin text-[#a2dd00]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/70">
                    Gerando áudio
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#f3f0ed]/8">
                    <div
                      className="h-full bg-[#a2dd00] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#f3f0ed]/40">
                  {progress}%
                </span>
              </div>
            </div>
          )}

          {/* ── Done state ──────────────────────────────────────────── */}
          {genState === 'done' && generatedAudioUrl && (
            <div className="space-y-2">
              <div className="rounded-xl border border-[#a2dd00]/20 bg-[#1e494b]/15 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a2dd00]/70">
                    Áudio gerado
                  </span>
                </div>
                <InlineAudioPlayer src={generatedAudioUrl} />
              </div>

              {/* Action row: download + (save voice clone-mode) + discard */}
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleDownload}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#f3f0ed]/8 bg-[#1e494b]/20 text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>Baixar áudio</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleDiscard}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 bg-[#1e494b]/20 text-[#f3f0ed]/40 transition-all hover:border-red-400/30 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>Descartar</TooltipContent>
                </Tooltip>
              </div>

              {/* Save voice (clone mode only) */}
              {mode === 'clone' && (() => {
                const quotaReached =
                  voiceQuotaLimit > 0 && savedVoices.length >= voiceQuotaLimit;
                const noQuota = voiceQuotaLimit === 0;
                const disabled = quotaReached || noQuota;

                if (showSaveVoiceForm) {
                  return (
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#a2dd00]/25 bg-[#a2dd00]/5 p-1.5">
                      <input
                        autoFocus
                        type="text"
                        maxLength={40}
                        value={saveVoiceName}
                        onChange={(e) => setSaveVoiceName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !savingVoice) handleSaveVoice();
                          if (e.key === 'Escape') {
                            setShowSaveVoiceForm(false);
                            setSaveVoiceName('');
                          }
                        }}
                        placeholder="Nome da voz"
                        className="h-8 flex-1 min-w-0 rounded-lg bg-[#1e494b]/30 px-3 text-xs text-[#f3f0ed]/90 placeholder-[#f3f0ed]/30 outline-none focus:bg-[#1e494b]/50"
                      />
                      <button
                        onClick={handleSaveVoice}
                        disabled={savingVoice || !saveVoiceName.trim()}
                        className="flex h-8 items-center gap-1 rounded-lg bg-[#a2dd00] px-3 text-xs font-bold text-[#1a2123] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingVoice ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          'Salvar'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowSaveVoiceForm(false);
                          setSaveVoiceName('');
                        }}
                        disabled={savingVoice}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="block">
                        <button
                          onClick={() => disabled ? undefined : setShowSaveVoiceForm(true)}
                          disabled={disabled}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#a2dd00]/25 bg-[#a2dd00]/5 text-xs font-bold text-[#a2dd00] transition-all hover:bg-[#a2dd00]/12 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          Salvar voz
                          {voiceQuotaLimit > 0 && (
                            <span className="text-[10px] font-medium opacity-60">
                              {savedVoices.length}/{voiceQuotaLimit}
                            </span>
                          )}
                        </button>
                      </span>
                    </TooltipTrigger>
                    {disabled && (
                      <TooltipContent side="top" sideOffset={6}>
                        {noQuota
                          ? 'Faça upgrade de plano para salvar vozes.'
                          : 'Limite atingido. Exclua uma voz salva ou faça upgrade.'}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })()}

              {/* Generate again */}
              <button
                onClick={handleDiscard}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/6 text-xs font-semibold text-[#f3f0ed]/40 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/70"
              >
                Gerar outro áudio
              </button>
            </div>
          )}

          {/* ── Form (idle state) ───────────────────────────────────── */}
          {genState === 'idle' && (
            <>
              {/* Texto */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  TEXTO
                </label>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                    rows={3}
                    placeholder={
                      mode === 'tts'
                        ? 'Escreva o texto que será narrado...'
                        : 'Escreva o texto que a voz clonada deve falar...'
                    }
                    className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/15 px-3 py-2 pb-6 text-sm leading-snug text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
                  />
                  <span className="absolute bottom-1.5 right-3 text-[10px] text-[#f3f0ed]/30">
                    {text.length}/{MAX_TEXT_LENGTH}
                  </span>
                </div>
              </div>

              {/* Áudio de referência (clone mode) */}
              {mode === 'clone' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                    ÁUDIO DE REFERÊNCIA
                  </label>
                  {isRecording ? (
                    <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/8 px-2.5 py-2">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
                          <span className="relative h-2 w-2 rounded-full bg-red-400" />
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.15em] text-red-400">
                          REC
                        </span>
                      </div>
                      <canvas
                        ref={visualizerCanvasRef}
                        className="h-8 min-w-0 flex-1"
                      />
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-red-400/80">
                        {formatRecordTime(recordSeconds)}
                      </span>
                      <button
                        onClick={stopRecording}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-all hover:bg-red-500/30 active:scale-95"
                        title="Parar gravação"
                      >
                        <Square className="h-3.5 w-3.5 fill-red-400" />
                      </button>
                    </div>
                  ) : referenceAudio && previewDataUrl ? (
                    <InlineAudioPlayer
                      src={previewDataUrl}
                      actions={
                        <button
                          onClick={clearReferenceAudio}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#f3f0ed]/15 text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold tracking-wider">UPLOAD</span>
                      </button>
                      <button
                        onClick={startRecording}
                        className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#f3f0ed]/15 text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold tracking-wider">GRAVAR</span>
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioFileSelect}
                  />
                </div>
              )}

              {/* Voz (TTS apenas) */}
              {mode === 'tts' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                    VOZ
                  </label>
                  <VoiceSelect
                    value={voiceId}
                    onValueChange={setVoiceId}
                    savedVoices={savedVoices}
                    defaultVoices={VOICE_OPTIONS}
                    onRenameSaved={handleRenameSavedVoice}
                    onDeleteSaved={handleDeleteSavedVoice}
                  />
                </div>
              )}

              {/* Idioma + Velocidade (TTS) ou só Idioma (clone) */}
              <div className={mode === 'tts' ? 'grid grid-cols-2 gap-3' : ''}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                    IDIOMA
                  </label>
                  <PanelSelect value={language} onValueChange={setLanguage} options={LANGUAGE_OPTIONS} />
                </div>
                {mode === 'tts' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                      VELOCIDADE
                    </label>
                    <PanelSelect value={speed} onValueChange={setSpeed} options={SPEED_OPTIONS} />
                  </div>
                )}
              </div>

              <GenerationErrorBanner msg={errorMsg} />

              {/* Custo estimado */}
              <div className="flex items-center justify-between rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3 w-3 text-[#a2dd00]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/40">
                    Custo estimado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f3f0ed]/70">
                    {creditsCost} créditos
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
                </div>
              </div>

              {/* Gerar */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: '#a2dd00',
                  color: '#1a2123',
                }}
              >
                <MicVocal className="h-4 w-4" />
                Gerar áudio
              </button>

              <p className="text-center text-[10px] text-[#f3f0ed]/25">
                {mode === 'tts'
                  ? 'O texto será sintetizado em voz pela IA.'
                  : 'A voz da gravação será replicada para falar o texto acima.'}
              </p>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatRecordTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function ModeTab({
  icon: Icon,
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex flex-col items-start gap-0.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${active
        ? 'border-[#a2dd00]/50 bg-[#a2dd00]/8'
        : 'border-[#f3f0ed]/[0.07] bg-[#1e494b]/15 hover:border-[#f3f0ed]/15 hover:bg-[#1e494b]/25'
        }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={`h-3.5 w-3.5 transition-colors ${active ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40 group-hover:text-[#f3f0ed]/70'
            }`}
        />
        <span
          className={`text-xs font-bold transition-colors ${active ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/70 group-hover:text-[#f3f0ed]'
            }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-[10px] transition-colors ${active ? 'text-[#a2dd00]/60' : 'text-[#f3f0ed]/30'
          }`}
      >
        {hint}
      </span>
      {active && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[#a2dd00]/20" />
      )}
    </button>
  );
}

function PanelSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function VoiceSelect({
  value,
  onValueChange,
  savedVoices,
  defaultVoices,
  onRenameSaved,
  onDeleteSaved,
}: {
  value: string;
  onValueChange: (v: string) => void;
  savedVoices: VoiceProfile[];
  defaultVoices: { value: string; label: string }[];
  onRenameSaved: (voice: VoiceProfile, newName: string) => void;
  onDeleteSaved: (voice: VoiceProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset transient row states whenever the dropdown closes
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditingName('');
      setConfirmDeleteId(null);
    }
  }, [open]);

  function startRename(voice: VoiceProfile) {
    setEditingId(voice.id);
    setEditingName(voice.name);
    setConfirmDeleteId(null);
  }

  function commitRename(voice: VoiceProfile) {
    onRenameSaved(voice, editingName);
    setEditingId(null);
    setEditingName('');
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName('');
  }

  function pickVoice(val: string) {
    onValueChange(val);
    setOpen(false);
  }

  // Compute the trigger label since cloned voices aren't SelectItem children
  const selectedClonedVoice = value.startsWith('clone:')
    ? savedVoices.find((v) => v.id === value.slice('clone:'.length))
    : null;
  const selectedDefaultVoice = !selectedClonedVoice
    ? defaultVoices.find((o) => o.value === value)
    : null;

  return (
    <Select value={value} onValueChange={onValueChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue placeholder="Selecione uma voz">
          {selectedClonedVoice ? (
            <span className="flex items-center gap-1.5">
              <MicVocal className="h-3 w-3 text-[#a2dd00]" />
              <span className="truncate">{selectedClonedVoice.name}</span>
            </span>
          ) : (
            selectedDefaultVoice?.label
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
        {savedVoices.length > 0 && (
          <div>
            <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#a2dd00]/70">
              Minhas vozes
            </div>
            <div className="sidebar-scroll max-h-36 space-y-1 overflow-y-auto pr-1">
              {savedVoices.map((voice) => {
                const isSelected = value === `clone:${voice.id}`;
                const isEditing = editingId === voice.id;
                const isConfirmingDelete = confirmDeleteId === voice.id;

                if (isEditing) {
                  return (
                    <div
                      key={voice.id}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 mb-2"
                    >
                      <MicVocal className="h-3 w-3 shrink-0 text-[#a2dd00]/70" />
                      <input
                        autoFocus
                        type="text"
                        maxLength={40}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitRename(voice);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        className="h-6 flex-1 min-w-0 rounded bg-[#1e494b]/40 px-2 text-xs text-[#f3f0ed]/90 outline-none focus:bg-[#1e494b]/60"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(voice)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#a2dd00] hover:bg-[#a2dd00]/15"
                        title="Salvar"
                      >
                        <Wand2 className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                        title="Cancelar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={voice.id}
                    className={`group flex items-center gap-1 rounded-lg pl-2 pr-1 py-1.5 transition-colors ${isSelected ? 'bg-[#a2dd00]/8' : 'hover:bg-[#1e494b]/40'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => pickVoice(`clone:${voice.id}`)}
                      className="flex flex-1 min-w-0 items-center gap-1.5 cursor-pointer text-left"
                    >
                      <MicVocal
                        className={`h-3 w-3 shrink-0 ${isSelected ? 'text-[#a2dd00]' : 'text-[#a2dd00]/70'}`}
                      />
                      <span
                        className={`truncate text-xs ${isSelected ? 'text-[#a2dd00] font-medium' : 'text-[#f3f0ed]/70'}`}
                      >
                        {voice.name}
                      </span>
                    </button>

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteSaved(voice);
                            setConfirmDeleteId(null);
                          }}
                          className="flex h-6 items-center gap-1 rounded bg-red-500/20 px-2 text-[10px] font-bold text-red-400 hover:bg-red-500/30"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                          title="Cancelar"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startRename(voice)}
                          className="flex h-6 w-6 items-center justify-center rounded text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                          title="Renomear"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(voice.id)}
                          className="flex h-6 w-6 items-center justify-center rounded text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <SelectGroup>
          {savedVoices.length > 0 && (
            <SelectLabel className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/30">
              Vozes padrão
            </SelectLabel>
          )}
          <div className="sidebar-scroll max-h-44 overflow-y-auto pr-1">
            {defaultVoices.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]"
              >
                {opt.label}
              </SelectItem>
            ))}
          </div>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function InlineAudioPlayer({
  src,
  actions,
}: {
  src: string;
  actions?: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Reset state if the source changes (new file/recording)
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
  }, [src]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => { });
    } else {
      el.pause();
    }
  }

  function handleLoadedMetadata() {
    const el = audioRef.current;
    if (!el) return;
    if (Number.isFinite(el.duration)) setDuration(el.duration);
  }

  function handleTimeUpdate() {
    if (seeking) return;
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
  }

  function handleSeek(clientX: number) {
    const bar = progressBarRef.current;
    const el = audioRef.current;
    if (!bar || !el || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
    setCurrentTime(el.currentTime);
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 p-2">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15 text-[#a2dd00] transition-all hover:bg-[#a2dd00]/25"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 translate-x-0.5" />
        )}
      </button>

      <div
        ref={progressBarRef}
        onMouseDown={(e) => {
          setSeeking(true);
          handleSeek(e.clientX);
        }}
        onMouseMove={(e) => {
          if (e.buttons !== 1) return;
          handleSeek(e.clientX);
        }}
        onMouseUp={() => setSeeking(false)}
        onMouseLeave={() => setSeeking(false)}
        className="group relative h-1.5 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-full bg-[#f3f0ed]/8"
      >
        <div
          className="h-full bg-[#a2dd00] transition-[width] duration-75"
          style={{ width: `${progressPct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a2dd00] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#f3f0ed]/50">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>

      <button
        onClick={() => setMuted((m) => !m)}
        className="flex h-5 w-5 shrink-0 items-center justify-center text-[#f3f0ed]/40 transition-colors hover:text-[#a2dd00]"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setVolume(v);
          if (v > 0 && muted) setMuted(false);
        }}
        className="h-1 w-10 shrink-0 cursor-pointer accent-[#a2dd00]"
      />

      {actions}

      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        preload="metadata"
        hidden
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

