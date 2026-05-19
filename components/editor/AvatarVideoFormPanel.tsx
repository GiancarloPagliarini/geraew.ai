'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Coins,
  Download,
  Loader2,
  MicVocal,
  Settings,
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

type GenState = 'idle' | 'generating' | 'done';

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
        avatar, script, resolution, aspectRatio, voiceId, optionsOpen,
        genState, generationId, videoUrl, errorMsg,
      }));
    } catch { /* ignore quota errors */ }
  }, [storageKey, avatar, script, resolution, aspectRatio, voiceId, optionsOpen, genState, generationId, videoUrl, errorMsg]);

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
  const { credits: estimatedCost, seconds: estimatedSeconds } = estimateAvatarVideoCost(
    resolution,
    script.length,
  );

  const avatarVideoModel = videoModels?.find((m) => m.slug === 'avatar-video');
  const featureDisabled = avatarVideoModel?.isActive === false;
  const featureDisabledMessage =
    avatarVideoModel?.statusMessage ?? tMaint('defaultMessage');

  const canSubmit =
    isReady &&
    script.trim().length > 0 &&
    !!voiceId &&
    !isGenerating &&
    !featureDisabled;
  const proportion = aspectRatio === '9:16' ? '9-16' : '16-9';

  async function handleSubmit() {
    if (!accessToken || !avatar) return;
    if (!canSubmit) return;

    // Decode the unified voiceId picked from VoicePickerModal.
    const voiceFields: { voiceProfileId?: string; inworldVoiceId?: string } = {};
    if (voiceId.startsWith('clone:')) {
      voiceFields.voiceProfileId = voiceId.slice('clone:'.length);
    } else if (voiceId.startsWith('inworld:')) {
      voiceFields.inworldVoiceId = voiceId.slice('inworld:'.length);
    }

    // Collapse the options block so the panel shrinks while generating —
    // same pattern used in GenerateVideoPanel. 320ms matches the max-height
    // close transition.
    setOptionsOpen(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 320));

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.avatars.generateVideo(accessToken, avatar.id, {
        script: script.trim(),
        resolution,
        aspectRatio,
        ...voiceFields,
      });
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
          {/* ── 1. Roteiro ────────────────────────────────────────────── */}
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
