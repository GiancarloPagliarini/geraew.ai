'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Coins,
  Download,
  Hd,
  Mic,
  MicVocal,
  RefreshCw,
  Square,
  SquarePlay,
  Trash2,
  Upload,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  api,
  ApiError,
  AvatarVideoAspectRatio,
  AvatarVideoResolution,
  InworldVoice,
  UserAvatar,
  VoiceProfile,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useGenerationErrorMessage } from '@/lib/use-generation-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenerationPreview } from '@/components/editor/GenerationPreview';
import { VoicePickerModal, type VoiceOption } from '@/components/voice/VoicePickerModal';

const RESOLUTIONS: { value: AvatarVideoResolution; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

const ASPECT_RATIOS: { value: AvatarVideoAspectRatio; label: string; hintKey: 'ratioReels' | 'ratioYoutube' }[] = [
  { value: '9:16', label: '9:16', hintKey: 'ratioReels' },
  { value: '16:9', label: '16:9', hintKey: 'ratioYoutube' },
];

const AVATAR_VIDEO_CREDITS_PER_SECOND: Record<AvatarVideoResolution, number> = {
  '720p': 50,
  '1080p': 70,
  '4k': 90,
};
const AVATAR_VIDEO_ESTIMATE_CHARS_PER_SEC = 11;
const AVATAR_VIDEO_MIN_DURATION_SEC = 3;

function estimateAvatarVideoCost(
  resolution: AvatarVideoResolution,
  scriptLength: number,
): { credits: number; seconds: number } {
  const rate = AVATAR_VIDEO_CREDITS_PER_SECOND[resolution];
  const seconds = Math.max(
    AVATAR_VIDEO_MIN_DURATION_SEC,
    Math.ceil(scriptLength / AVATAR_VIDEO_ESTIMATE_CHARS_PER_SEC),
  );
  return { credits: Math.ceil(seconds * rate), seconds };
}

function actualAvatarVideoCost(
  resolution: AvatarVideoResolution,
  audioDurationSec: number,
): { credits: number; seconds: number } {
  const rate = AVATAR_VIDEO_CREDITS_PER_SECOND[resolution];
  const seconds = Math.max(AVATAR_VIDEO_MIN_DURATION_SEC, Math.ceil(audioDurationSec));
  return { credits: Math.ceil(seconds * rate), seconds };
}

type GenState = 'idle' | 'generating' | 'done';
type InputMode = 'voice' | 'audio';

const MAX_CUSTOM_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_CUSTOM_AUDIO_SECONDS = 600; // 10 min — backend cap
const ACCEPTED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/x-m4a',
] as const;
const PRESIGN_AUDIO_MIMES: Record<string, 'audio/mpeg' | 'audio/mp4' | 'audio/wav' | 'audio/webm' | 'audio/x-m4a'> = {
  'audio/mpeg': 'audio/mpeg',
  'audio/mp4': 'audio/mp4',
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/webm': 'audio/webm',
  'audio/x-m4a': 'audio/x-m4a',
};

const selectTriggerClass =
  "w-full shrink-0 !h-11 rounded-[10px] border-app-hairline bg-app-surface px-3.5 text-[14px] font-semibold text-app-text shadow-none transition-colors duration-200 ease-app hover:border-app-hairline-2 focus-visible:border-[rgba(162,221,0,0.4)] focus-visible:ring-0 dark:bg-app-surface dark:hover:bg-app-surface [&_svg:not([class*='text-'])]:text-app-muted";
const selectContentClass =
  'rounded-xl border-app-hairline-2 bg-app-card text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]';
const selectItemClass =
  'rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface AvatarVideoPanelProps {
  avatar: UserAvatar;
  /** gate de manutenção vindo da AvatarView (admin pode desligar avatar-video) */
  videoDisabled?: boolean;
  videoDisabledMessage?: string;
}

/**
 * Versão inline (no shell) do formulário de gerar vídeo com avatar.
 * Mesma lógica do AvatarVideoFormPanel do canvas, sem o acoplamento ao editor
 * (sem nodeId / useEditor / drag handle). A geração roda e exibe o resultado
 * aqui mesmo, sem redirecionar para o workspace.
 */
export function AvatarVideoPanel({ avatar, videoDisabled, videoDisabledMessage }: AvatarVideoPanelProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations('editorDialogs.avatars.form');
  const tMaint = useTranslations('editorDialogs.avatars.maintenance');
  const mapError = useGenerationErrorMessage();

  // Persistência por avatar — sobrevive reload e troca de aba/ferramenta.
  const storageKey = `geraew-avatar-video-inline-${avatar.id}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [script, setScript] = useState<string>(stored?.script ?? '');
  const [resolution, setResolution] = useState<AvatarVideoResolution>(stored?.resolution ?? '1080p');
  const [aspectRatio, setAspectRatio] = useState<AvatarVideoAspectRatio>(stored?.aspectRatio ?? '9:16');
  const [voiceId, setVoiceId] = useState<string>(stored?.voiceId ?? '');
  // VoiceOption selecionado (para exibir o nome no botão); o id segue o formato
  // unificado `clone:<id>` | `inworld:<id>`, igual ao Text para voz.
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [voicePickerClosing, setVoicePickerClosing] = useState(false);
  const voicePickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeVoicePicker = () => {
    setVoicePickerClosing(true);
    voicePickerTimer.current = setTimeout(() => {
      setVoicePickerOpen(false);
      setVoicePickerClosing(false);
    }, 180);
  };

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [inputMode, setInputMode] = useState<InputMode>(stored?.inputMode ?? 'voice');
  const [customAudio, setCustomAudio] = useState<{
    file: File;
    previewUrl: string;
    durationSeconds: number;
    sizeBytes: number;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [genState, setGenState] = useState<GenState>(stored?.genState ?? 'idle');
  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [videoUrl, setVideoUrl] = useState<string | null>(stored?.videoUrl ?? null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(stored?.errorMsg ?? null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persiste form + estado de geração a cada mudança.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        script, resolution, aspectRatio, voiceId, inputMode,
        genState, generationId, videoUrl, errorMsg,
      }));
    } catch { /* ignore quota errors */ }
  }, [storageKey, script, resolution, aspectRatio, voiceId, inputMode, genState, generationId, videoUrl, errorMsg]);

  // Carrega vozes clonadas + Inworld uma vez.
  useEffect(() => {
    if (!accessToken) return;
    setVoicesLoading(true);
    Promise.all([
      api.voices.list(accessToken).then((res) => res.voices.filter((v) => v.status === 'READY')),
      api.inworld.listVoices().then((res) => res.voices).catch(() => [] as InworldVoice[]),
    ])
      .then(([ownVoices, inworld]) => {
        setVoices(ownVoices);
        setInworldVoices(inworld);
        if (!voiceId) {
          const pt = inworld.find((v) => v.langCode.startsWith('PT'));
          if (pt) setVoiceId(`inworld:${pt.voiceId}`);
          else if (ownVoices[0]) setVoiceId(`clone:${ownVoices[0].id}`);
          else if (inworld[0]) setVoiceId(`inworld:${inworld[0].voiceId}`);
        }
      })
      .catch(() => {
        setVoices([]);
        setInworldVoices([]);
      })
      .finally(() => setVoicesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const isGenerating = genState === 'generating' || submitting;

  // Polling do status enquanto gera.
  useEffect(() => {
    if (genState !== 'generating' || !generationId || !accessToken) return;
    let cancelled = false;

    async function poll() {
      if (cancelled || !accessToken) return;
      try {
        const gen = await api.generations.get(accessToken, generationId!);
        if (cancelled) return;
        if (gen.status === 'COMPLETED' && gen.outputs.length > 0) {
          setVideoUrl(gen.outputs[0].url);
          setGenState('done');
          return;
        }
        if (gen.status === 'FAILED') {
          setErrorMsg(mapError(gen.errorMessage));
          // falha estorna os créditos — reflete o saldo de volta
          queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
          setGenState('idle');
          return;
        }
        pollTimerRef.current = setTimeout(poll, 3_000);
      } catch {
        if (!cancelled) pollTimerRef.current = setTimeout(poll, 6_000);
      }
    }

    pollTimerRef.current = setTimeout(poll, 1_500);
    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genState, generationId, accessToken]);

  // ── Áudio customizado (upload + gravação) ───────────────────────────────

  async function probeAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const d = el.duration;
        URL.revokeObjectURL(url);
        if (Number.isFinite(d) && d > 0) resolve(d);
        else reject(new Error('invalid_duration'));
      };
      el.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('load_error'));
      };
      el.src = url;
    });
  }

  async function handleAudioFilePicked(file: File) {
    if (file.size > MAX_CUSTOM_AUDIO_BYTES) {
      toast.error(t('audioTooLarge'));
      return;
    }
    if (!ACCEPTED_AUDIO_MIMES.includes(file.type as typeof ACCEPTED_AUDIO_MIMES[number])) {
      toast.error(t('audioInvalidFormat'));
      return;
    }
    let duration: number;
    try {
      duration = await probeAudioDuration(file);
    } catch {
      toast.error(t('audioInvalidFormat'));
      return;
    }
    if (duration > MAX_CUSTOM_AUDIO_SECONDS) {
      toast.error(t('audioTooLong'));
      return;
    }
    if (customAudio?.previewUrl) URL.revokeObjectURL(customAudio.previewUrl);
    setCustomAudio({
      file,
      previewUrl: URL.createObjectURL(file),
      durationSeconds: duration,
      sizeBytes: file.size,
    });
  }

  function clearCustomAudio() {
    if (customAudio?.previewUrl) URL.revokeObjectURL(customAudio.previewUrl);
    setCustomAudio(null);
  }

  async function startCustomAudioRecording() {
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
      let elapsed = 0;
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blobType = mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        const ext = blobType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: blobType });
        await handleAudioFilePicked(file).catch(() => {});
        setCustomAudio((cur) =>
          cur && !Number.isFinite(cur.durationSeconds) ? { ...cur, durationSeconds: elapsed } : cur,
        );
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordSeconds(elapsed);
        if (elapsed >= MAX_CUSTOM_AUDIO_SECONDS) stopCustomAudioRecording();
      }, 1000);
    } catch {
      toast.error(t('audioMicAccess'));
    }
  }

  function stopCustomAudioRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  }

  // Libera URLs ao desmontar.
  useEffect(() => {
    return () => {
      if (customAudio?.previewUrl) URL.revokeObjectURL(customAudio.previewUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (voicePickerTimer.current) clearTimeout(voicePickerTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isReady = avatar.status === 'READY';
  const { credits: estimatedCost, seconds: estimatedSeconds } =
    inputMode === 'audio' && customAudio
      ? actualAvatarVideoCost(resolution, customAudio.durationSeconds)
      : estimateAvatarVideoCost(resolution, script.length);

  const canSubmit =
    isReady &&
    !isGenerating &&
    !videoDisabled &&
    (inputMode === 'voice'
      ? script.trim().length > 0 && !!voiceId
      : !!customAudio);
  const proportion = aspectRatio === '9:16' ? '9-16' : '16-9';

  // Nome exibido no botão de voz: prefere o VoiceOption escolhido; senão resolve
  // pelo id (caso reidratado do localStorage); senão fallback de loading/seleção.
  const voiceLabel =
    selectedVoice?.name ??
    (voiceId.startsWith('clone:')
      ? voices.find((v) => v.id === voiceId.slice('clone:'.length))?.name
      : voiceId.startsWith('inworld:')
        ? inworldVoices.find((v) => `inworld:${v.voiceId}` === voiceId)?.displayName
        : undefined) ??
    (voicesLoading ? t('voiceLoading') : t('voiceSelect'));

  async function handleSubmit() {
    if (!accessToken || !canSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      let payload: Parameters<typeof api.avatars.generateVideo>[2];

      if (inputMode === 'audio' && customAudio) {
        const presignType = PRESIGN_AUDIO_MIMES[customAudio.file.type] ?? 'audio/mpeg';
        const ext = customAudio.file.name.split('.').pop()?.toLowerCase() || 'mp3';
        const safeFilename = `audio-${Date.now()}.${ext}`;
        const presigned = await api.uploads.presigned(accessToken, {
          filename: safeFilename,
          contentType: presignType,
          purpose: 'avatar_audio',
        });
        const putRes = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': customAudio.file.type },
          body: customAudio.file,
        });
        if (!putRes.ok) {
          throw new Error('Falha ao enviar o áudio.');
        }
        payload = {
          customAudioKey: presigned.fileKey,
          audioDurationSeconds: Math.ceil(customAudio.durationSeconds),
          resolution,
          aspectRatio,
        };
      } else {
        const voiceFields: { voiceProfileId?: string; inworldVoiceId?: string } = {};
        if (voiceId.startsWith('clone:')) {
          voiceFields.voiceProfileId = voiceId.slice('clone:'.length);
        } else if (voiceId.startsWith('inworld:')) {
          voiceFields.inworldVoiceId = voiceId.slice('inworld:'.length);
        }
        payload = {
          script: script.trim(),
          resolution,
          aspectRatio,
          ...voiceFields,
        };
      }

      const res = await api.avatars.generateVideo(accessToken, avatar.id, payload);
      toast.success(t('queuedToast', { credits: res.creditsConsumed }));
      // créditos debitados — atualiza o saldo (topbar/perfil)
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      setGenerationId(res.generationId);
      setVideoUrl(null);
      setVideoVisible(false);
      setGenState('generating');
    } catch (err) {
      const msg = mapError(err instanceof ApiError || err instanceof Error ? err.message : null);
      toast.error(msg);
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setGenerationId(null);
    setVideoUrl(null);
    setVideoVisible(false);
    setErrorMsg(null);
  }

  return (
    <>
      {/* *:shrink-0 — sem isso o flex esmaga os filhos antes de rolar */}
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto p-5 scrollbar-app *:shrink-0">
        {/* ── Modo de entrada (Voz → Vídeo / Áudio → Vídeo) ── */}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t('inputModeLabel')}</FieldLabel>
          <Select
            value={inputMode}
            onValueChange={(v) => setInputMode(v as InputMode)}
            disabled={isGenerating}
          >
            {/* o ícone vem junto no SelectValue (clonado do item selecionado) */}
            <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              <SelectItem value="voice" className={selectItemClass}>
                <MicVocal className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                {t('modeVoice')}
              </SelectItem>
              <SelectItem value="audio" className={selectItemClass}>
                <Mic className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                {t('modeAudio')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Roteiro (modo voz) ── */}
        {inputMode === 'voice' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('promptLabel')}</FieldLabel>
            <div className="flex flex-col rounded-xl border border-app-hairline bg-app-surface transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder={t('scriptPlaceholder')}
                maxLength={3000}
                rows={5}
                disabled={isGenerating}
                className="w-full resize-none bg-transparent p-3.5 text-[14px] leading-relaxed text-app-text outline-none placeholder:text-app-muted disabled:opacity-60"
              />
              <span className="px-3.5 pb-3 text-right font-mono text-[11px] text-app-muted">
                {script.length}/3000
              </span>
            </div>
          </div>
        )}

        {/* ── Áudio (modo áudio) ── */}
        {inputMode === 'audio' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('audioInputLabel')}</FieldLabel>
            {customAudio ? (
              <div className="flex flex-col gap-3 rounded-xl border border-[rgba(162,221,0,0.3)] bg-app-surface p-3.5">
                <audio src={customAudio.previewUrl} controls className="h-10 w-full" />
                <div className="flex items-center justify-between text-[12px] text-app-text-2">
                  <span className="tabular-nums">
                    {t('audioReady', { duration: formatTime(customAudio.durationSeconds) })}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isGenerating}
                      className="flex h-7 items-center gap-1 rounded-md bg-app-card px-2 text-[11px] font-semibold text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text disabled:opacity-50"
                    >
                      <Upload className="size-3" strokeWidth={1.8} />
                      {t('audioReplace')}
                    </button>
                    <button
                      type="button"
                      onClick={clearCustomAudio}
                      disabled={isGenerating}
                      className="flex h-7 items-center gap-1 rounded-md bg-red-500/15 px-2 text-[11px] font-semibold text-red-300 transition-colors duration-200 ease-app hover:bg-red-500/25 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" strokeWidth={1.8} />
                      {t('audioRemove')}
                    </button>
                  </div>
                </div>
              </div>
            ) : isRecording ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-500" />
                </span>
                <span className="flex-1 font-mono text-[13px] text-app-text">
                  {t('audioRec')} {formatTime(recordSeconds)}
                </span>
                <button
                  type="button"
                  onClick={stopCustomAudioRecording}
                  className="flex size-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors duration-200 ease-app hover:bg-red-500/30"
                  title={t('audioStopRecording')}
                >
                  <Square className="size-3.5" fill="currentColor" strokeWidth={0} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="size-[19px]" strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold">{t('audioUpload')}</span>
                </button>
                <button
                  type="button"
                  onClick={startCustomAudioRecording}
                  disabled={isGenerating}
                  className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mic className="size-[19px]" strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold">{t('audioStartRecording')}</span>
                </button>
              </div>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/x-m4a,.mp3,.wav,.m4a,.webm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAudioFilePicked(f);
                e.target.value = '';
              }}
            />
          </div>
        )}

        {/* ── Preview (aurora enquanto gera, vídeo quando pronto) ── */}
        {genState !== 'idle' && (
          <GenerationPreview
            proportion={proportion}
            genState={genState}
            imageVisible={genState === 'done' && videoVisible}
            progress={0}
            renderMedia={
              videoUrl
                ? () => (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full bg-black object-contain"
                    onLoadedData={() => setVideoVisible(true)}
                  />
                )
                : undefined
            }
          >
            {videoUrl && genState === 'done' && (
              <>
                <ActionButton title={t('openInTab')} onClick={() => window.open(videoUrl, '_blank')}>
                  <ArrowUpRight className="size-3.5" />
                </ActionButton>
                <ActionButton title={t('download')} onClick={() => handleDownload(videoUrl)}>
                  <Download className="size-3.5" />
                </ActionButton>
                <ActionButton title={t('discard')} onClick={handleDiscard}>
                  <X className="size-3.5" />
                </ActionButton>
              </>
            )}
          </GenerationPreview>
        )}

        {/* ── Voz (modo voz) ── */}
        {inputMode === 'voice' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('voiceLabel')}</FieldLabel>
            <VoicePickerButton
              label={voiceLabel}
              disabled={isGenerating}
              onClick={() => {
                setVoicePickerClosing(false);
                setVoicePickerOpen(true);
              }}
            />
          </div>
        )}

        {/* ── Resolução + proporção ── */}
        <div
          className="grid grid-cols-2 gap-3"
          style={{
            opacity: isGenerating ? 0.4 : 1,
            pointerEvents: isGenerating ? 'none' : undefined,
          }}
        >
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('resolutionLabel')}</FieldLabel>
            <Select value={resolution} onValueChange={(v) => setResolution(v as AvatarVideoResolution)}>
              <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
                <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                <span className="flex-1 truncate text-left font-mono text-[13px]">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                {RESOLUTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className={cn(selectItemClass, 'font-mono')}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('ratioLabel')}</FieldLabel>
            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as AvatarVideoAspectRatio)}>
              <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
                <SquarePlay className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                <span className="flex-1 truncate text-left font-mono text-[13px]">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                {ASPECT_RATIOS.map((a) => (
                  <SelectItem key={a.value} value={a.value} className={cn(selectItemClass, 'font-mono')}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Custo estimado ── */}
        <div className="rounded-xl border border-app-hairline bg-app-surface px-3.5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="size-3.5 text-app-lime" strokeWidth={1.8} />
              <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                {t('estimateLabel')}
              </span>
            </div>
            <span className="text-[13px] font-bold text-app-text">
              {t('estimateValue', { credits: estimatedCost.toLocaleString() })}
            </span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-app-muted">
            {t('estimateHint', { seconds: estimatedSeconds })}
          </p>
        </div>

        {/* ── Banner de erro — persiste até gerar de novo ── */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-red-500/25 bg-red-500/[0.07] p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" strokeWidth={1.8} />
            <p className="min-w-0 text-[12.5px] leading-relaxed text-app-text-2">{errorMsg}</p>
          </div>
        )}

        {/* ── Gerar / manutenção ── */}
        {videoDisabled ? (
          <div className="flex w-full flex-col items-center gap-1.5 rounded-[10px] border border-amber-500/30 bg-amber-500/10 py-3 text-center">
            <div className="flex items-center gap-1.5 text-[13.5px] font-bold text-amber-300/90">
              <Wrench className="size-4" strokeWidth={1.8} />
              {tMaint('title')}
            </div>
            <p className="px-3 text-[12px] leading-relaxed text-amber-200/70">
              {videoDisabledMessage}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-lime text-[14.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="size-4 animate-spin" strokeWidth={2} />
                {t('generating')}
              </>
            ) : (
              <>
                <Video className="size-4" strokeWidth={2} />
                {genState === 'done' ? t('generateAnother') : t('generate')}
              </>
            )}
          </button>
        )}
      </div>

      {voicePickerOpen && (
        <VoicePickerModal
          selected={voiceId || null}
          closing={voicePickerClosing}
          onSelect={(v) => {
            setVoiceId(v.id);
            setSelectedVoice(v);
            closeVoicePicker();
          }}
          onClose={closeVoicePicker}
        />
      )}
    </>
  );
}

// ─── Local helpers ──────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
      {children}
    </span>
  );
}

function VoicePickerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('editorDialogs.avatars.form');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center gap-2 rounded-[10px] border border-app-hairline bg-app-surface px-3.5 text-[14px] text-app-text transition-colors duration-200 ease-app hover:border-app-hairline-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MicVocal className="size-[15px] shrink-0 text-app-lime" strokeWidth={1.8} />
      <span className="flex-1 truncate text-left font-semibold">{label}</span>
      <span className="flex shrink-0 items-center gap-0.5 text-[10.5px] font-bold uppercase tracking-wider text-app-lime/80">
        {t('voicesAction')}
        <ChevronRight className="size-3" />
      </span>
    </button>
  );
}

function ActionButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex size-7 items-center justify-center rounded-full bg-black/55 text-white/80 backdrop-blur-md transition-colors duration-200 ease-app hover:bg-black/70 hover:text-app-lime"
    >
      {children}
    </button>
  );
}

async function handleDownload(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'geraew-avatar-video.mp4';
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geraew-avatar-video.mp4';
    a.click();
  }
}
