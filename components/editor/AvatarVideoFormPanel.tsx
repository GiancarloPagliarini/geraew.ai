'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Coins,
  Download,
  Loader2,
  Mic,
  MicVocal,
  Settings,
  Square,
  Trash2,
  Upload,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
import { useEditor } from '@/lib/editor-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GenerationPreview } from './GenerationPreview';
import { VoicePickerModal } from './VoicePickerModal';

const RESOLUTIONS: { value: AvatarVideoResolution; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

/** `hintKey` is resolved against `editorDialogs.avatars.form` at render time. */
const ASPECT_RATIOS: { value: AvatarVideoAspectRatio; label: string; hintKey: 'ratioReels' | 'ratioYoutube' }[] = [
  { value: '9:16', label: '9:16', hintKey: 'ratioReels' },
  { value: '16:9', label: '16:9', hintKey: 'ratioYoutube' },
];

/**
 * Per-second credit rates by resolution — mirrors backend
 * `AVATAR_VIDEO_CREDITS_PER_SECOND`. Final cost is reconciled against the
 * real video duration after the HeyGen webhook lands; what we show here is
 * the upfront estimate based on script length.
 */
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

/** Exact cost from a known audio duration (custom audio mode). */
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

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface AvatarVideoFormPanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function AvatarVideoFormPanel({ nodeId, onClose }: AvatarVideoFormPanelProps) {
  const { accessToken } = useAuth();
  const { consumePendingAvatarVideoForm, setNodeGenerating } = useEditor();
  const t = useTranslations('editorDialogs.avatars.form');
  const tMaint = useTranslations('editorDialogs.avatars.maintenance');
  const tRoot = useTranslations('editorDialogs.avatars');
  const tCommon = useTranslations('editorPanels.common');

  const panelRef = useRef<HTMLDivElement>(null);

  // ── Persistent state (survives page reload) ──────────────────────────────
  const storageKey = `geraew-panel-avatar-video-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  // Avatar to generate for — comes from the pending request on mount, or
  // rehydrated from localStorage on reload.
  const [avatar, setAvatar] = useState<UserAvatar | null>(stored?.avatar ?? null);

  const [script, setScript] = useState<string>(stored?.script ?? '');
  const [resolution, setResolution] = useState<AvatarVideoResolution>(stored?.resolution ?? '1080p');
  const [aspectRatio, setAspectRatio] = useState<AvatarVideoAspectRatio>(stored?.aspectRatio ?? '9:16');
  /** Unified voice id from VoicePickerModal — 'clone:<id>' | 'inworld:<voiceId>'. */
  const [voiceId, setVoiceId] = useState<string>(stored?.voiceId ?? '');
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState<boolean>(stored?.optionsOpen ?? true);

  // ── Input mode (voice TTS vs. custom audio) ───────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>(stored?.inputMode ?? 'voice');
  // Object URL (local preview) + meta of the loaded custom audio. We DON'T
  // persist the file itself in localStorage — too large; user re-uploads on reload.
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

  // ── Generation lifecycle ───────────────────────────────────────────────
  const [genState, setGenState] = useState<GenState>(stored?.genState ?? 'idle');
  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [videoUrl, setVideoUrl] = useState<string | null>(stored?.videoUrl ?? null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(stored?.errorMsg ?? null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consume the pending avatar payload on mount (skip if already rehydrated
  // from localStorage — reload case).
  useEffect(() => {
    if (avatar) return;
    const pending = consumePendingAvatarVideoForm();
    if (pending) setAvatar(pending.avatar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist form + generation state on every change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        avatar, script, resolution, aspectRatio, voiceId, optionsOpen, inputMode,
        genState, generationId, videoUrl, errorMsg,
      }));
    } catch { /* ignore quota errors */ }
  }, [storageKey, avatar, script, resolution, aspectRatio, voiceId, optionsOpen, inputMode, genState, generationId, videoUrl, errorMsg]);

  // Mark node as generating during submit / polling so user can't accidentally
  // close it mid-flight (Canvas/PanelNode blocks deletion of generating nodes).
  const isGenerating = genState === 'generating' || submitting;
  useEffect(() => {
    setNodeGenerating(nodeId, isGenerating);
    return () => setNodeGenerating(nodeId, false);
  }, [nodeId, isGenerating, setNodeGenerating]);

  // Load cloned + Inworld voices once
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

  // Feature gate — mirrors AvatarsDialog. If admin turned this off, lock the
  // panel into maintenance mode (UI stays accessible, generate disabled).
  // Must be called before any early return to satisfy React's hooks rules.
  const { data: videoModels } = useQuery({
    queryKey: ['models', 'video'],
    queryFn: () => api.models.listVideos(),
    staleTime: 60_000,
  });

  // Block wheel events from reaching ReactFlow when scrolling inside form fields.
  // Depends on `avatar` because the early-return JSX (when avatar is null) doesn't
  // mount panelRef — the effect must re-run once the main JSX renders.
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
  }, [avatar]);

  // Poll generation status while generating
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
          setErrorMsg(gen.errorMessage || t('errorGenericFail'));
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
  }, [genState, generationId, accessToken]);

  function handleCloseAndClear() {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    onClose?.();
  }

  // ── Custom audio handlers (file upload + mic recording) ────────────────

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
    // Replace any previous preview
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
        stream.getTracks().forEach((t) => t.stop());
        const blobType = mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        const ext = blobType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: blobType });
        // Reuse the validation pipeline — also probes the real duration so we
        // don't trust the wall-clock timer if the browser miscounts.
        await handleAudioFilePicked(file).catch(() => {});
        // Fallback duration if probe fails on some webm blobs
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

  // Free the preview URL on unmount
  useEffect(() => {
    return () => {
      if (customAudio?.previewUrl) URL.revokeObjectURL(customAudio.previewUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!avatar) {
    // Panel mounted but the pending payload wasn't consumed (e.g. page reload
    // after the user closed/cleared this panel's storage).
    return (
      <TooltipProvider>
        <div className="w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl shadow-black/50 sm:w-[320px]">
          <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
              <span className="text-[11px] font-medium text-[#f3f0ed]/60">{t('headerTagline')}</span>
            </div>
            <button
              type="button"
              onClick={handleCloseAndClear}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="px-3 pb-3">
            <p
              className="text-center text-[11px] leading-relaxed text-white/45"
              dangerouslySetInnerHTML={{ __html: t.raw('headerHint') as string }}
            />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  const isReady = avatar.status === 'READY';
  // Cost: exact in audio mode (we know the duration), estimate in voice mode.
  const { credits: estimatedCost, seconds: estimatedSeconds } =
    inputMode === 'audio' && customAudio
      ? actualAvatarVideoCost(resolution, customAudio.durationSeconds)
      : estimateAvatarVideoCost(resolution, script.length);

  const avatarVideoModel = videoModels?.find((m) => m.slug === 'avatar-video');
  const featureDisabled = avatarVideoModel?.isActive === false;
  const featureDisabledMessage =
    avatarVideoModel?.statusMessage ?? tMaint('defaultMessage');

  const canSubmit =
    isReady &&
    !isGenerating &&
    !featureDisabled &&
    (inputMode === 'voice'
      ? script.trim().length > 0 && !!voiceId
      : !!customAudio);
  const proportion = aspectRatio === '9:16' ? '9-16' : '16-9';

  async function handleSubmit() {
    if (!accessToken || !avatar) return;
    if (!canSubmit) return;

    // Collapse the options block so the panel shrinks while generating —
    // same pattern used in GenerateVideoPanel. 320ms matches the max-height
    // close transition.
    setOptionsOpen(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 320));

    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Build the payload differently per mode. Custom audio mode requires
      // uploading the file first; the resulting fileKey goes into the body.
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
        // Straight PUT — no progress UI for this short request (audio ≤25MB)
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
        // Voice mode — decode unified voice id and send the script
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
      setGenerationId(res.generationId);
      setVideoUrl(null);
      setVideoVisible(false);
      setGenState('generating');
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('errorGenerate');
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
    <TooltipProvider>
      <div ref={panelRef} className="w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl shadow-black/50 sm:w-[320px]">
        {/* Drag handle / header */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between gap-2 px-3 py-3 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-2.5">
            {avatar.previewImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatar.previewImageUrl}
                alt={avatar.name}
                className="h-9 w-9 shrink-0 rounded-full border border-[#a2dd00]/35 object-cover shadow-[0_0_0_3px_rgba(162,221,0,0.06)]"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10">
                <Video className="h-4 w-4 text-[#a2dd00]/70" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#f3f0ed]/35">
                Gerar vídeo
              </div>
              <div className="truncate text-[13px] font-extrabold leading-tight text-[#f3f0ed]/90">
                {avatar.name}
              </div>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCloseAndClear}
                disabled={isGenerating}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {isGenerating ? t('waitGenerating') : tRoot('close')}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-2 px-3 pb-3">
          {/* ── Input mode switch (Voz ↔ Áudio) ─────────────────────── */}
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 p-0.5">
            {(['voice', 'audio'] as const).map((mode) => {
              const active = inputMode === mode;
              const label = mode === 'voice' ? t('modeVoice') : t('modeAudio');
              const Icon = mode === 'voice' ? MicVocal : Mic;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setInputMode(mode)}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: active ? 'rgba(162,221,0,0.12)' : 'transparent',
                    color: active ? '#a2dd00' : 'rgba(243,240,237,0.45)',
                    boxShadow: active ? '0 0 0 1px rgba(162,221,0,0.25)' : 'none',
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── 1a. Roteiro (modo voz) ───────────────────────────────── */}
          {inputMode === 'voice' && (
            <div>
              <FieldLabel label={t('scriptLabel')} />
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder={t('scriptPlaceholder')}
                maxLength={3000}
                rows={3}
                disabled={isGenerating}
                className="w-full resize-none rounded-lg border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#f3f0ed]/90 placeholder:text-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30 disabled:opacity-60"
              />
              <div className="mt-1 flex justify-end">
                <span className="text-[10px] tabular-nums text-[#f3f0ed]/30">
                  {script.length}/3000
                </span>
              </div>
            </div>
          )}

          {/* ── 1b. Áudio (modo áudio) ────────────────────────────────── */}
          {inputMode === 'audio' && (
            <div>
              <FieldLabel label={t('audioInputLabel')} />
              {customAudio ? (
                <div className="flex flex-col gap-2 rounded-lg border border-[#a2dd00]/30 bg-[#a2dd00]/[0.05] px-3 py-2.5">
                  <audio src={customAudio.previewUrl} controls className="h-8 w-full" />
                  <div className="flex items-center justify-between text-[10.5px] text-[#f3f0ed]/55">
                    <span className="tabular-nums">
                      {t('audioReady', { duration: formatTime(customAudio.durationSeconds) })}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isGenerating}
                        className="flex h-6 items-center gap-1 rounded-md bg-[#f3f0ed]/[0.06] px-2 text-[10px] font-bold text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/[0.1] disabled:opacity-50"
                      >
                        <Upload className="h-2.5 w-2.5" />
                        {t('audioReplace')}
                      </button>
                      <button
                        type="button"
                        onClick={clearCustomAudio}
                        disabled={isGenerating}
                        className="flex h-6 items-center gap-1 rounded-md bg-red-500/15 px-2 text-[10px] font-bold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        {t('audioRemove')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : isRecording ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/[0.08] px-3 py-2.5">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-400/60" />
                    <span className="relative h-2 w-2 rounded-full bg-red-400" />
                  </span>
                  <span className="text-[10.5px] font-bold tracking-[0.15em] text-red-400">
                    {t('audioRec')}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-red-400/80">
                    {formatTime(recordSeconds)}
                  </span>
                  <button
                    type="button"
                    onClick={stopCustomAudioRecording}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/25 text-red-300 transition-colors hover:bg-red-500/35"
                    title={t('audioStopRecording')}
                  >
                    <Square className="h-3 w-3 fill-current" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isGenerating}
                    className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#f3f0ed]/15 text-[10.5px] font-medium text-[#f3f0ed]/50 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t('audioUpload')}
                  </button>
                  <button
                    type="button"
                    onClick={startCustomAudioRecording}
                    disabled={isGenerating}
                    className="flex h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#f3f0ed]/15 text-[10.5px] font-medium text-[#f3f0ed]/50 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {t('audioStartRecording')}
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
                  e.target.value = ''; // allow re-selecting same file
                }}
              />
            </div>
          )}

          {/* ── Preview area (aurora while generating, video when done) ── */}
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
                  <ActionButton
                    title={t('openInTab')}
                    onClick={() => window.open(videoUrl, '_blank')}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton title={t('download')} onClick={() => handleDownload(videoUrl)}>
                    <Download className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton title={t('discard')} onClick={handleDiscard}>
                    <X className="h-3.5 w-3.5" />
                  </ActionButton>
                </>
              )}
            </GenerationPreview>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-2.5 py-2">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
              <p className="text-[10.5px] leading-relaxed text-red-300/90">{errorMsg}</p>
            </div>
          )}

          {/* ── Options toggle (divider + gear) ───────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 overflow-hidden">
              <div
                className="h-full w-full origin-right bg-[#f3f0ed]/[0.07] transition-transform duration-700 ease-out"
                style={{ transform: optionsOpen ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setOptionsOpen((o) => !o)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#a2dd00]/60 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
                >
                  <Settings
                    className="h-5 w-5 transition-transform duration-500"
                    style={{ transform: optionsOpen ? 'rotate(0deg)' : 'rotate(-180deg)' }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6}>
                {optionsOpen ? tCommon('hideOptions') : tCommon('showOptions')}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* ── Collapsible block — voz, resolução, proporção, custo, CTA ── */}
          <div
            style={{
              maxHeight: optionsOpen ? '600px' : '0px',
              overflow: 'hidden',
              transition: optionsOpen ? 'max-height 400ms ease' : 'max-height 300ms ease',
            }}
          >
            <div className="space-y-2 pt-0.5">
              {/* Voice picker only applies to TTS mode. In custom-audio mode
                  the audio was already supplied by the user. */}
              {inputMode === 'voice' && (
                <div>
                  <FieldLabel label={t('voiceLabel')} />
                  <VoicePickerButton
                    value={voiceId}
                    savedVoices={voices}
                    inworldVoices={inworldVoices}
                    loading={voicesLoading}
                    disabled={isGenerating}
                    onClick={() => setVoicePickerOpen(true)}
                  />
                </div>
              )}

              <div
                className="grid grid-cols-2 gap-3"
                style={{
                  opacity: isGenerating ? 0.4 : 1,
                  pointerEvents: isGenerating ? 'none' : undefined,
                }}
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/35">
                    {t('resolutionLabel')}
                  </label>
                  <PanelSelect
                    value={resolution}
                    onValueChange={(v) => setResolution(v as AvatarVideoResolution)}
                    options={RESOLUTIONS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/35">
                    {t('ratioLabel')}
                  </label>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS.map((a) => {
                      const active = aspectRatio === a.value;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => setAspectRatio(a.value)}
                          title={t(a.hintKey)}
                          className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-30"
                          style={{
                            background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                            color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                            border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                            boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                          }}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cost row — estimate based on script length; reconciled
                  against the real duration when the HeyGen webhook lands. */}
              <div
                className="rounded-xl border px-3 py-2 transition-colors"
                style={{
                  borderColor: 'rgba(243,240,237,0.07)',
                  background: 'rgba(243,240,237,0.03)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3 w-3 text-[#a2dd00]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/40">
                      {t('estimateLabel')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#f3f0ed]/70">
                      {t('estimateValue', { credits: estimatedCost.toLocaleString() })}
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
                  </div>
                </div>
                <p className="mt-1 text-[9.5px] leading-relaxed text-[#f3f0ed]/30">
                  {t('estimateHint', { seconds: estimatedSeconds })}
                </p>
              </div>

              {/* Generate button (full width, matches GenerateVideoPanel).
                  When the avatar-video feature gate is off, render as a
                  disabled maintenance state with the admin's status message. */}
              {featureDisabled ? (
                <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-center">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-amber-300/90">
                    <Wrench className="h-4 w-4" />
                    {tMaint('title')}
                  </div>
                  <p className="px-3 text-[10.5px] leading-relaxed text-amber-200/70">
                    {featureDisabledMessage}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: isGenerating ? 'rgba(162,221,0,0.12)' : '#a2dd00',
                    color: isGenerating ? '#a2dd00' : '#1a2123',
                    border: isGenerating ? '1px solid rgba(162,221,0,0.2)' : 'none',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" />
                      {genState === 'done' ? t('generateAnother') : t('generate')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <VoicePickerModal
        open={voicePickerOpen}
        onOpenChange={setVoicePickerOpen}
        selectedVoiceId={voiceId}
        savedVoices={voices}
        inworldVoices={inworldVoices}
        loadingInworld={voicesLoading}
        onPickVoice={setVoiceId}
      />
    </TooltipProvider>
  );
}

// ─── Local helpers ──────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3f0ed]/45">
        {label}
      </span>
    </div>
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
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[110] rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
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
  disabled,
  onClick,
}: {
  value: string;
  savedVoices: VoiceProfile[];
  inworldVoices: InworldVoice[];
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations('editorDialogs.avatars.form');
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
        ? t('voiceLoading')
        : t('voiceSelect');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-full items-center gap-2 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all hover:border-[#a2dd00]/40 hover:bg-[#1e494b]/30 focus:border-[#a2dd00]/40 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MicVocal className="h-3.5 w-3.5 shrink-0 text-[#a2dd00]" />
      <span className="flex-1 truncate text-left">{label}</span>
      <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-[#a2dd00]/80">
        {t('voicesAction')}
        <ChevronRight className="h-3 w-3" />
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
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
