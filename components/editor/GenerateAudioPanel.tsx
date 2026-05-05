'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bookmark,
  ChevronRight,
  Coins,
  Download,
  Loader2,
  Mic,
  MicVocal,
  Pause,
  Play,
  Sparkles,
  Speech,
  Square,
  Trash2,
  Type,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { StudioPill, StudioSelectPill } from './studio/StudioControls';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { VoicePickerModal } from './VoicePickerModal';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { idbDelete, idbLoad, idbSave } from '@/lib/panel-idb';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api, ApiError, InworldVoice, VoiceProfile } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { useGenerationRecovery } from '@/lib/use-generation-recovery';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';
type Mode = 'tts' | 'clone';

interface ModeGen {
  audioUrl: string | null;
  generationId: string | null;
  state: GenState;
  errorMsg: string | null;
}

interface ReferenceAudio {
  base64: string;
  mime_type: string;
  durationSeconds?: number;
}

const MAX_TEXT_LENGTH = 900;
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
// Tabela de créditos por geração de áudio. O threshold separa texto curto
// (até 399 chars) de texto longo (400+). TTS usa Inworld preset; CLONE inclui
// criar voz nova OU usar uma voz salva (tudo via OmniVoice voice-clone).
const AUDIO_TIER_THRESHOLD = 400;
const TTS_CREDIT_COST_SHORT = 35;
const TTS_CREDIT_COST_LONG = 45;
const CLONE_CREDIT_COST_SHORT = 65;
const CLONE_CREDIT_COST_LONG = 80;

function ttsCreditCost(textLength: number): number {
  return textLength >= AUDIO_TIER_THRESHOLD ? TTS_CREDIT_COST_LONG : TTS_CREDIT_COST_SHORT;
}
function cloneCreditCost(textLength: number): number {
  return textLength >= AUDIO_TIER_THRESHOLD ? CLONE_CREDIT_COST_LONG : CLONE_CREDIT_COST_SHORT;
}


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
  const t = useTranslations('editorPanels.audio');
  const {
    consumeCredits,
    refetchCredits,
    prependToGallery,
    setNodeGenerating,
    pendingPromptRef,
    consumePendingPrompt,
    voicesVersion,
    bumpVoicesVersion,
    studioMode,
    openVoicesDialog,
  } = useEditor();
  const { accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [pendingPrompt] = useState(() => {
    if (pendingPromptRef.current?.panelType === 'generate-audio') {
      return consumePendingPrompt();
    }
    return null;
  });

  const storageKey = `geraew-panel-audio-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Per-mode generation snapshots so each tab keeps its own session.
  // Migrates legacy stored shape (single set of fields) to byMode on first load.
  const initialMode: Mode =
    pendingPrompt?.audioMode ?? stored?.mode ?? 'tts';
  const initialByMode = ((): Record<Mode, ModeGen> => {
    const fromByMode = stored?.byMode as
      | Partial<Record<Mode, ModeGen>>
      | undefined;
    const legacyAtRoot: ModeGen | null = stored?.generationId || stored?.generatedAudioUrl
      ? {
        audioUrl: stored.generatedAudioUrl ?? null,
        generationId: stored.generationId ?? null,
        state:
          stored.genState === 'generating' && stored.generationId
            ? 'generating'
            : stored.generatedAudioUrl
              ? 'done'
              : 'idle',
        errorMsg: null,
      }
      : null;
    const empty: ModeGen = {
      audioUrl: null,
      generationId: null,
      state: 'idle',
      errorMsg: null,
    };
    return {
      tts:
        fromByMode?.tts ??
        (initialMode === 'tts' && legacyAtRoot ? legacyAtRoot : empty),
      clone:
        fromByMode?.clone ??
        (initialMode === 'clone' && legacyAtRoot ? legacyAtRoot : empty),
    };
  })();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState<string>(stored?.text ?? '');
  const [voiceId, setVoiceId] = useState<string>(
    pendingPrompt?.voiceId ?? stored?.voiceId ?? '',
  );
  const [speed, setSpeed] = useState<string>(stored?.speed ?? '1');
  const [savedByMode, setSavedByMode] = useState<Record<Mode, ModeGen>>(initialByMode);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(initialByMode[initialMode].audioUrl);
  const [generationId, setGenerationId] = useState<string | null>(initialByMode[initialMode].generationId);
  const [genState, setGenState] = useState<GenState>(initialByMode[initialMode].state);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialByMode[initialMode].errorMsg);
  const [progress, setProgress] = useState(0);

  function switchMode(newMode: Mode) {
    if (newMode === mode) return;
    // Save current mode's snapshot
    const currentSnapshot: ModeGen = {
      audioUrl: generatedAudioUrl,
      generationId,
      state: genState,
      errorMsg,
    };
    setSavedByMode((prev) => ({ ...prev, [mode]: currentSnapshot }));
    // Restore new mode's snapshot
    const next = savedByMode[newMode];
    setGeneratedAudioUrl(next.audioUrl);
    setGenerationId(next.generationId);
    setGenState(next.state);
    setErrorMsg(next.errorMsg);
    setProgress(0);
    setMode(newMode);
  }

  const [referenceAudio, setReferenceAudio] = useState<ReferenceAudio | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  // Reset on every new reference sample so the user re-confirms ownership.
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [consentExpanded, setConsentExpanded] = useState(false);

  // Saved voice profiles (from /voices)
  const [savedVoices, setSavedVoices] = useState<VoiceProfile[]>([]);
  const [voiceQuotaLimit, setVoiceQuotaLimit] = useState<number>(0);
  const [savingVoice, setSavingVoice] = useState(false);
  const [showSaveVoiceForm, setShowSaveVoiceForm] = useState(false);
  const [saveVoiceName, setSaveVoiceName] = useState('');
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);

  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [inworldLoading, setInworldLoading] = useState(true);

  // Status do toggle global de áudio (admin pode desativar)
  const [audioDisabled, setAudioDisabled] = useState(false);
  const [audioDisabledMessage, setAudioDisabledMessage] = useState<string | null>(null);

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

  // Persist form state — current mode's live state always overrides its byMode entry
  useEffect(() => {
    try {
      const byMode: Record<Mode, ModeGen> = {
        ...savedByMode,
        [mode]: {
          audioUrl: generatedAudioUrl,
          generationId,
          state: genState,
          errorMsg,
        },
      };
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          mode,
          text,
          voiceId,
          speed,
          byMode,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [storageKey, mode, text, voiceId, speed, generatedAudioUrl, generationId, genState, errorMsg, savedByMode]);

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

  // Reset consent whenever the sample changes or is cleared.
  useEffect(() => {
    setVoiceConsent(false);
  }, [referenceAudio]);

  // Load saved voice profiles. Re-fetches when `voicesVersion` bumps.
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
            setVoiceId('');
          }
        }
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, voicesVersion]);

  // Load Inworld preset voices (public endpoint, no auth needed)
  useEffect(() => {
    let cancelled = false;
    setInworldLoading(true);
    api.inworld
      .listVoices()
      .then((res) => {
        if (cancelled) return;
        setInworldVoices(res.voices.filter((v) => v.source !== 'PVC'));
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setInworldLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Verifica se admin desativou geração de áudio globalmente.
  useEffect(() => {
    let cancelled = false;
    api.models
      .listAudio()
      .then((models) => {
        if (cancelled) return;
        const gateway = models.find((m) => m.slug === 'audio-generation');
        if (gateway && !gateway.isActive) {
          setAudioDisabled(true);
          setAudioDisabledMessage(gateway.statusMessage ?? null);
        } else {
          setAudioDisabled(false);
          setAudioDisabledMessage(null);
        }
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset legacy/invalid voiceId once Inworld voices arrive — leaves the
  // selection empty so the user picks intentionally (no default voice).
  useEffect(() => {
    if (!inworldVoices.length) return;
    if (!voiceId) return;
    const isValid =
      voiceId.startsWith('clone:') ||
      (voiceId.startsWith('inworld:') &&
        inworldVoices.some((v) => `inworld:${v.voiceId}` === voiceId));
    if (!isValid) setVoiceId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inworldVoices]);


  // Resume in-progress generation
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (genState === 'generating' && generationId && accessToken) {
      resumedRef.current = true;
      startProgressAnimation(85);
      startPollingFallback(generationId);
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
          fallback: t('errors.fallback'),
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
              fallback: t('errors.fallback'),
            }),
          );
          refetchCredits();
        }
      } catch {
        cleanupGeneration();
        setGenState('idle');
        setErrorMsg(
          showGenerationError({
            fallback: t('errors.fallbackConnection'),
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
      toast.error(t('errors.fileNotAudio'));
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      toast.error(t('errors.fileTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setReferenceAudio({ base64, mime_type: file.type });
      toast.success(t('success.audioAdded'));
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
          toast.success(t('success.recordingSaved'));
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
      toast.error(t('errors.micAccess'));
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
      toast.error(t('errors.voiceNameRequired'));
      return;
    }
    setSavingVoice(true);
    try {
      const voice = await api.voices.create(accessToken, {
        generationId,
        name: trimmed,
      });
      setSavedVoices((prev) => [voice, ...prev]);
      bumpVoicesVersion();
      setShowSaveVoiceForm(false);
      setSaveVoiceName('');
      toast.success(t('success.voiceSaved', { name: voice.name }));
      // Switch to TTS mode pre-selecting the new voice for immediate reuse
      switchMode('tts');
      setVoiceId(`clone:${voice.id}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('errors.voiceSaveFailed');
      toast.error(msg);
    } finally {
      setSavingVoice(false);
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
      setErrorMsg(t('errors.noReferenceAudio'));
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
            speed: parseFloat(speed),
          })
          : await api.generations.voiceClone(accessToken, {
            text,
            audio: referenceAudio!.base64,
            audio_mime_type: referenceAudio!.mime_type,
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
              fallback: t('errors.fallback'),
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
            errorMessage: t('errors.concurrentLimit'),
            fallback: t('errors.startFailed'),
          }),
        );
        return;
      }
      setErrorMsg(
        showGenerationError({
          errorMessage: err instanceof Error ? err.message : null,
          fallback: t('errors.startFailedConnection'),
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
  // CLONE pricing só na hora de CRIAR a voz pela primeira vez. Quando a voz
  // já está salva, TTS com ela usa o mesmo custo das vozes padrão.
  const textLen = text.trim().length;
  const creditsCost =
    mode === 'clone' ? cloneCreditCost(textLen) : ttsCreditCost(textLen);
  const canGenerate =
    !isGenerating &&
    !audioDisabled &&
    text.trim().length > 0 &&
    (mode === 'tts'
      ? voiceId.length > 0
      : referenceAudio !== null && voiceConsent);

  const previewDataUrl = referenceAudio
    ? `data:${referenceAudio.mime_type};base64,${referenceAudio.base64}`
    : null;

  if (studioMode) {
    const selectedClonedVoice = voiceId.startsWith('clone:')
      ? savedVoices.find((v) => v.id === voiceId.slice('clone:'.length))
      : null;
    const selectedInworldVoice = !selectedClonedVoice && voiceId.startsWith('inworld:')
      ? inworldVoices.find((v) => `inworld:${v.voiceId}` === voiceId)
      : null;
    const voiceLabel = selectedClonedVoice?.name
      ?? selectedInworldVoice?.displayName
      ?? (voiceId || 'Selecionar voz');
    const voiceOptions = [
      ...savedVoices.map((v) => ({ value: `clone:${v.id}`, label: v.name })),
      ...inworldVoices.map((v) => ({ value: `inworld:${v.voiceId}`, label: v.displayName })),
    ];

    return (
      <TooltipProvider>
        <div
          ref={panelRef}
          className="group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50"
          style={{ width: 340 }}
        >
          <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
              <span className="text-[11px] font-medium text-[#f3f0ed]/60">Gerar Áudio</span>
            </div>
            <div className="flex items-center gap-1">
              <PanelDuplicateButton onClick={onDuplicate} />
              <button
                onClick={() => { localStorage.removeItem(storageKey); idbDelete(`${storageKey}-audio`).catch(() => { }); onClose?.(); }}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2 px-3 pb-3">
            <GenerationErrorBanner msg={errorMsg} />

            <div className="flex items-center gap-1.5">
              <StudioPill
                active={mode === 'tts'}
                disabled={isGenerating}
                onClick={() => setMode('tts')}
                icon={<Type className="h-3 w-3" />}
              >
                TTS
              </StudioPill>
              <StudioPill
                active={mode === 'clone'}
                disabled={isGenerating}
                onClick={() => setMode('clone')}
                icon={<Speech className="h-3 w-3" />}
              >
                Clone
              </StudioPill>
            </div>

            {genState === 'done' && generatedAudioUrl ? (
              <div className="rounded-xl bg-[#0d1011] p-2">
                <InlineAudioPlayer src={generatedAudioUrl} />
                <div className="mt-1.5 flex justify-end gap-1.5">
                  <a
                    href={generatedAudioUrl}
                    download
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f0ed]/5 text-[#f3f0ed]/60 transition-all hover:text-[#a2dd00]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={handleDiscard}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f0ed]/5 text-[#f3f0ed]/60 transition-all hover:text-[#a2dd00]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={mode === 'tts' ? 'Digite o texto que será falado...' : 'Digite o texto que sua voz clonada vai falar...'}
                disabled={isGenerating}
                rows={3}
                maxLength={MAX_TEXT_LENGTH}
                className="min-h-[80px] w-full resize-none rounded-xl bg-[#0d1011] px-3 py-2.5 text-[12px] text-[#f3f0ed]/85 placeholder-[#f3f0ed]/30 outline-none disabled:opacity-50"
              />
            )}

            {mode === 'clone' && (
              isRecording ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/8 px-2 py-1.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
                    <span className="relative h-2 w-2 rounded-full bg-red-400" />
                  </span>
                  <canvas ref={visualizerCanvasRef} className="h-6 min-w-0 flex-1" />
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-red-400/80">
                    {formatRecordTime(recordSeconds)}
                  </span>
                  <button
                    onClick={stopRecording}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-all hover:bg-red-500/30 active:scale-95"
                  >
                    <Square className="h-3 w-3 fill-red-400" />
                  </button>
                </div>
              ) : referenceAudio ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#0d1011] px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setVoiceConsent((v) => !v)}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all ${voiceConsent ? 'border-[#a2dd00] bg-[#a2dd00]' : 'border-[#f3f0ed]/30'}`}
                    aria-label="Consent"
                  >
                    {voiceConsent && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-[#1a2123]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2.5,6.5 5,9 9.5,3.5" />
                      </svg>
                    )}
                  </button>
                  <MicVocal className="h-3.5 w-3.5 shrink-0 text-[#a2dd00]" />
                  <span className="flex-1 truncate text-[11px] text-[#f3f0ed]/70">Referência carregada</span>
                  <button
                    onClick={clearReferenceAudio}
                    disabled={isGenerating}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:text-[#f3f0ed]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0d1011] px-3 py-2 text-[11px] font-medium text-[#f3f0ed]/50 transition-all hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Anexar
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isGenerating}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0d1011] px-3 py-2 text-[11px] font-medium text-[#f3f0ed]/50 transition-all hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    Gravar
                  </button>
                </div>
              )
            )}
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFileSelect} />

            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/studio:grid-rows-[1fr] group-hover/studio:opacity-100">
              <div className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  {mode === 'tts' && (
                    <StudioSelectPill
                      value={voiceId}
                      label={voiceLabel}
                      options={voiceOptions}
                      onChange={setVoiceId}
                      disabled={isGenerating}
                      icon={<MicVocal className="h-3 w-3 text-[#a2dd00]" />}
                    />
                  )}
                  <StudioSelectPill
                    value={speed}
                    label={SPEED_OPTIONS.find((s) => s.value === speed)?.label ?? speed}
                    options={SPEED_OPTIONS}
                    onChange={setSpeed}
                    disabled={isGenerating}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#a2dd00] px-2.5 py-1 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {creditsCost}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

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
              {t('header')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} disabled={isGenerating} />
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

        <div className="space-y-3 p-4">
          {/* ── Aviso global: áudio desativado pelo admin ─────────── */}
          {audioDisabled && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-amber-400">
                  {t('audioDisabled.title')}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#f3f0ed]/55">
                  {audioDisabledMessage ?? t('audioDisabled.fallbackMessage')}
                </p>
              </div>
            </div>
          )}

          {/* ── Mode tabs ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <ModeTab
              icon={Type}
              label={t('modes.tts')}
              hint={t('modes.ttsHint')}
              active={mode === 'tts'}
              disabled={isGenerating}
              onClick={() => switchMode('tts')}
            />
            <ModeTab
              icon={Speech}
              label={t('modes.clone')}
              hint={t('modes.cloneHint')}
              active={mode === 'clone'}
              disabled={isGenerating}
              onClick={() => switchMode('clone')}
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
                    {t('states.generating')}
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
                    {t('states.audioGenerated')}
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
                      {t('buttons.download')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>{t('buttons.downloadTooltip')}</TooltipContent>
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
                    <div className="space-y-2.5 rounded-2xl border border-[#a2dd00]/30 bg-gradient-to-br from-[#a2dd00]/[0.08] to-transparent p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/15 text-[#a2dd00]">
                          <Bookmark className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[#f3f0ed]/90">
                            {t('buttons.saveVoiceCloned')}
                          </div>
                          <div className="mt-0.5 text-[10px] leading-relaxed text-[#f3f0ed]/45">
                            {t('saveVoiceForm.subtitle')}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowSaveVoiceForm(false);
                            setSaveVoiceName('');
                          }}
                          disabled={savingVoice}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                          {t('fields.voiceName')}
                        </label>
                        <div className="relative">
                          <input
                            autoFocus
                            type="text"
                            maxLength={40}
                            value={saveVoiceName}
                            onChange={(e) => setSaveVoiceName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !savingVoice && saveVoiceName.trim())
                                handleSaveVoice();
                              if (e.key === 'Escape') {
                                setShowSaveVoiceForm(false);
                                setSaveVoiceName('');
                              }
                            }}
                            placeholder={t('placeholders.voiceName')}
                            className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 pr-12 text-xs text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] tabular-nums text-[#f3f0ed]/30">
                            {saveVoiceName.length}/40
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleSaveVoice}
                        disabled={savingVoice || !saveVoiceName.trim()}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-[#a2dd00] text-xs font-bold text-[#1a2123] transition-all active:scale-95 disabled:opacity-50"
                      >
                        {savingVoice ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('states.saving')}
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-3.5 w-3.5" />
                            {t('buttons.saveVoice')}
                          </>
                        )}
                      </button>

                      {voiceQuotaLimit > 0 && (
                        <p className="text-center text-[10px] text-[#f3f0ed]/35">
                          {savedVoices.length >= voiceQuotaLimit
                            ? t('saveVoiceForm.quotaReached', { used: savedVoices.length, total: voiceQuotaLimit })
                            : t('saveVoiceForm.quotaSaved', { used: savedVoices.length, total: voiceQuotaLimit })}
                        </p>
                      )}
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
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#a2dd00]/25 bg-[#a2dd00]/5 text-xs font-bold text-[#a2dd00] transition-all hover:bg-[#a2dd00]/12 disabled:opacity-40"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          {t('buttons.saveVoice')}
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
                          ? t('saveVoiceForm.tooltipNoQuota')
                          : t('saveVoiceForm.tooltipQuotaReached')}
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
                {t('buttons.generateAnother')}
              </button>
            </div>
          )}

          {/* ── Form (idle state) ───────────────────────────────────── */}
          {genState === 'idle' && (
            <>
              {/* Texto */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  {t('fields.text')}
                </label>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                    rows={3}
                    placeholder={
                      mode === 'tts'
                        ? t('placeholders.ttsText')
                        : t('placeholders.cloneText')
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
                    {t('fields.referenceAudio')}
                  </label>
                  {isRecording ? (
                    <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/8 px-2.5 py-2">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
                          <span className="relative h-2 w-2 rounded-full bg-red-400" />
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.15em] text-red-400">
                          {t('states.rec')}
                        </span>
                      </div>
                      <canvas
                        ref={visualizerCanvasRef}
                        className="h-8 min-w-0 flex-1"
                      />
                      <span className="shrink-0 font-mono text-[10px] tabular-nums text-red-400/80">
                        {formatRecordTime(recordSeconds)}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={stopRecording}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400 transition-all hover:bg-red-500/30 active:scale-95"
                          >
                            <Square className="h-3.5 w-3.5 fill-red-400" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>{t('buttons.stopRecording')}</TooltipContent>
                      </Tooltip>
                    </div>
                  ) : referenceAudio && previewDataUrl ? (
                    <>
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
                      <div
                        className={`mt-2 overflow-hidden rounded-xl border transition-all ${voiceConsent
                          ? 'border-[#a2dd00]/40 bg-[#a2dd00]/[0.06]'
                          : 'border-[#f3f0ed]/[0.07] bg-[#1e494b]/15'
                          }`}
                      >
                        <div className="flex items-center gap-2 px-2.5 py-2">
                          <button
                            type="button"
                            onClick={() => setVoiceConsent((v) => !v)}
                            className="flex flex-1 items-center gap-2 text-left"
                          >
                            <span
                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all ${voiceConsent
                                ? 'border-[#a2dd00] bg-[#a2dd00]'
                                : 'border-[#f3f0ed]/30 bg-transparent'
                                }`}
                            >
                              {voiceConsent && (
                                <svg
                                  viewBox="0 0 12 12"
                                  className="h-2.5 w-2.5 text-[#1a2123]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="2.5,6.5 5,9 9.5,3.5" />
                                </svg>
                              )}
                            </span>
                            <span className="text-[11px] font-medium text-[#f3f0ed]/80">
                              {t('consent.label')}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConsentExpanded((v) => !v)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]/80"
                            aria-label={consentExpanded ? t('buttons.collapseDetails') : t('buttons.expandDetails')}
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 transition-transform ${consentExpanded ? 'rotate-90' : ''
                                }`}
                            />
                          </button>
                        </div>
                        {consentExpanded && (
                          <div className="border-t border-[#f3f0ed]/[0.06] px-2.5 py-2">
                            <p className="text-[10px] leading-relaxed text-[#f3f0ed]/55">
                              {t('consent.details')}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#f3f0ed]/15 text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold tracking-wider">{t('buttons.upload')}</span>
                        </button>
                        <button
                          onClick={startRecording}
                          className="flex h-12 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#f3f0ed]/15 text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold tracking-wider">{t('buttons.record')}</span>
                        </button>
                      </div>
                      <p className="mt-1.5 text-center text-[10px] leading-relaxed text-[#f3f0ed]/40">
                        {t.rich('minDuration', {
                          seconds: 10,
                          strong: (chunks) => (
                            <span className="font-semibold text-[#f3f0ed]/65">{chunks}</span>
                          ),
                        })}
                      </p>
                    </>
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
                    {t('fields.voice')}
                  </label>
                  <VoicePickerButton
                    value={voiceId}
                    savedVoices={savedVoices}
                    inworldVoices={inworldVoices}
                    loading={inworldLoading}
                    onClick={() => openVoicesDialog()}
                  />
                </div>
              )}

              {/* Velocidade (TTS apenas) */}
              {mode === 'tts' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                    {t('fields.speed')}
                  </label>
                  <PanelSelect value={speed} onValueChange={setSpeed} options={SPEED_OPTIONS} />
                </div>
              )}

              <GenerationErrorBanner msg={errorMsg} />

              {/* Custo estimado */}
              <div className="flex items-center justify-between rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3 w-3 text-[#a2dd00]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/40">
                    {t('estimatedCost')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f3f0ed]/70">
                    {t('credits', { count: creditsCost })}
                  </span>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
                </div>
              </div>

              {/* Gerar */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: '#a2dd00',
                  color: '#1a2123',
                }}
              >
                <MicVocal className="h-4 w-4" />
                {t('buttons.generateAudio')}
              </button>
            </>
          )}
        </div>
      </div>

      <VoicePickerModal
        open={voicePickerOpen}
        onOpenChange={setVoicePickerOpen}
        selectedVoiceId={voiceId}
        savedVoices={savedVoices}
        inworldVoices={inworldVoices}
        loadingInworld={inworldLoading}
        onPickVoice={setVoiceId}
        onAddVoice={() => switchMode('clone')}
      />
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
      className={`group relative flex flex-col items-start gap-0.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-50 ${active
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

function VoicePickerButton({
  value,
  savedVoices,
  inworldVoices,
  loading,
  onClick,
}: {
  value: string;
  savedVoices: VoiceProfile[];
  inworldVoices: InworldVoice[];
  loading: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('editorPanels.voicePicker');
  const selectedClonedVoice = value.startsWith('clone:')
    ? savedVoices.find((v) => v.id === value.slice('clone:'.length))
    : null;
  const selectedInworldVoice =
    !selectedClonedVoice && value.startsWith('inworld:')
      ? inworldVoices.find((v) => `inworld:${v.voiceId}` === value)
      : null;

  const label = selectedClonedVoice
    ? selectedClonedVoice.name
    : selectedInworldVoice
      ? selectedInworldVoice.displayName
      : loading
        ? t('loading')
        : t('selectVoice');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all hover:border-[#a2dd00]/40 hover:bg-[#1e494b]/30 focus:border-[#a2dd00]/40"
    >
      <MicVocal className="h-3.5 w-3.5 shrink-0 text-[#a2dd00]" />
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a2dd00]/80">
        {t('voicesButton')}
        <ChevronRight className="h-3 w-3" />
      </span>
    </button>
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

