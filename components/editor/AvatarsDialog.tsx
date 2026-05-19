'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  UserAvatar,
  UserAvatarQuota,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import { CreateAvatarModal } from './CreateAvatarModal';

interface AvatarsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POLL_INTERVAL_MS = 8_000;

export function AvatarsDialog({ open, onOpenChange }: AvatarsDialogProps) {
  const { user, accessToken } = useAuth();
  const { studioMode, requestAvatarVideoForm } = useEditor();
  const t = useTranslations('editorDialogs.avatars');
  const locale = useLocale();

  const [avatars, setAvatars] = useState<UserAvatar[]>([]);
  const [quota, setQuota] = useState<UserAvatarQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check if the avatar-video feature gate is on; admin can disable it via
  // the /admin/modelos page. When off, the "Gerar vídeo" button on each card
  // shows a maintenance icon and the panel can't be opened.
  const { data: videoModels } = useQuery({
    queryKey: ['models', 'video'],
    queryFn: () => api.models.listVideos(),
    staleTime: 60_000,
  });
  const avatarVideoModel = videoModels?.find((m) => m.slug === 'avatar-video');
  const avatarVideoEnabled = avatarVideoModel?.isActive !== false;
  const avatarVideoDisabledMessage =
    avatarVideoModel?.statusMessage ?? t('maintenance.defaultMessage');

  const hasFetchedRef = useRef(false);
  const fetchRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount/unmount animation
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchAvatars(silent = false) {
    if (!user || !accessToken) return;
    const id = ++fetchRef.current;
    try {
      if (!silent) {
        setLoading(true);
        setError(false);
      }
      const res = await api.avatars.list(accessToken);
      if (id === fetchRef.current) {
        setAvatars(res.avatars);
        setQuota(res.quota);
        hasFetchedRef.current = true;
      }
    } catch {
      if (id === fetchRef.current && !silent) setError(true);
    } finally {
      if (id === fetchRef.current && !silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!user || !accessToken) return;
    if (hasFetchedRef.current) return;
    fetchAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, accessToken]);

  // Poll while there are avatars in transient states (training etc.)
  useEffect(() => {
    if (!open || !user || !accessToken) return;
    const hasTransient = avatars.some(
      (a) =>
        a.status === 'PENDING' ||
        a.status === 'SUBMITTING' ||
        a.status === 'TRAINING',
    );
    if (!hasTransient) return;

    pollTimerRef.current = setTimeout(() => {
      fetchAvatars(true);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatars, open, user, accessToken]);

  useEffect(() => {
    if (!user) {
      hasFetchedRef.current = false;
      setAvatars([]);
      setQuota(null);
    }
  }, [user]);

  function handleAvatarCreated(created: UserAvatar) {
    setAvatars((prev) => [created, ...prev]);
    fetchAvatars(true); // refresh quota
  }

  async function handleDelete(avatarId: string) {
    if (!accessToken) return;
    setDeletingId(avatarId);
    try {
      await api.avatars.delete(accessToken, avatarId);
      setAvatars((prev) => prev.filter((a) => a.id !== avatarId));
      fetchAvatars(true);
      toast.success(t('deleteSuccess'));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('deleteError');
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  if (!mounted) return null;

  const hasAnyAvatar = avatars.length > 0;
  const canCreate = quota?.enabled && quota.used < quota.limit;

  return (
    <aside
      className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col ${studioMode ? 'bg-[#0d1011]' : 'bg-[#171f21]'} text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white/85">{t('header')}</span>
          {!loading && quota && (
            <span className="text-[10px] font-bold text-[#a2dd00]/80 bg-[#a2dd00]/[0.08] px-2 py-0.5 rounded-full tabular-nums">
              {quota.used}/{quota.limit || '—'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchAvatars()}
            disabled={loading}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            title={t('refresh')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-white/15" />
              <span className="animate-pulse text-xs font-semibold text-white/50">{t('loading')}</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-white/40">
            <span className="text-xs">{t('errorLoad')}</span>
            <button
              onClick={() => fetchAvatars()}
              className="rounded-md bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08]"
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <>
            {/* Plan gating banner */}
            {quota && !quota.enabled && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-yellow-400/80 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-yellow-400/90 leading-relaxed">
                    {t('planBanner.title')}
                  </p>
                  <p className="text-[10px] text-yellow-400/60 mt-0.5">
                    {t('planBanner.description')}
                  </p>
                </div>
              </div>
            )}

            {/* Section header */}
            <div className="px-1 pt-2 pb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a2dd00]/75">
              <span className="h-1 w-1 rounded-full bg-[#a2dd00]/70" />
              {t('sectionTitle')}
              <span className="ml-auto rounded-full bg-[#a2dd00]/[0.08] px-1.5 py-px text-[9px] font-bold tabular-nums text-[#a2dd00]/80">
                {avatars.length}
              </span>
            </div>

            {/* Empty state — when the user has no avatars yet, show one big
                hero card with the helpful copy embedded, instead of the tiny
                grid card + redundant banner below. */}
            {!hasAnyAvatar && canCreate && avatarVideoEnabled ? (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[#a2dd00]/30 bg-gradient-to-br from-[#a2dd00]/[0.08] via-[#a2dd00]/[0.02] to-transparent p-6 text-center text-[#a2dd00]/85 transition-all hover:border-[#a2dd00]/55 hover:from-[#a2dd00]/[0.14] hover:text-[#a2dd00] hover:shadow-[0_0_28px_-8px_rgba(162,221,0,0.45)]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,#a2dd00_1px,transparent_1px),linear-gradient(to_bottom,#a2dd00_1px,transparent_1px)] [background-size:16px_16px]"
                />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/15 ring-1 ring-[#a2dd00]/30 transition-transform group-hover:scale-110">
                  <Plus className="h-7 w-7" strokeWidth={2} />
                </span>
                <div className="relative space-y-1.5">
                  <div className="text-[14px] font-extrabold text-[#a2dd00]">
                    {t('createCard.emptyTitle')}
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/55">
                    {t('createCard.emptyDescription')}
                  </p>
                </div>
                <div className="relative mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#a2dd00]/12 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] ring-1 ring-[#a2dd00]/30 transition-all group-hover:bg-[#a2dd00]/20">
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                  {t('createCard.label')}
                </div>
              </button>
            ) : (
              /* Regular grid — user has avatars OR can't create */
              <div className="grid grid-cols-2 gap-2">
                {/* Create card — only when user can create. */}
                {canCreate && (avatarVideoEnabled ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="group relative flex min-h-[180px] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed border-[#a2dd00]/30 bg-gradient-to-br from-[#a2dd00]/[0.08] via-[#a2dd00]/[0.02] to-transparent p-4 text-[#a2dd00]/85 transition-all hover:border-[#a2dd00]/55 hover:from-[#a2dd00]/[0.14] hover:text-[#a2dd00] hover:shadow-[0_0_28px_-8px_rgba(162,221,0,0.45)]"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(to_right,#a2dd00_1px,transparent_1px),linear-gradient(to_bottom,#a2dd00_1px,transparent_1px)] [background-size:16px_16px]"
                    />
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#a2dd00]/15 ring-1 ring-[#a2dd00]/30 transition-transform group-hover:scale-110">
                      <Plus className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="relative text-[12px] font-bold">{t('createCard.label')}</span>
                  </button>
                ) : (
                  <div
                    title={avatarVideoDisabledMessage}
                    className="flex min-h-[180px] cursor-not-allowed flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.05] p-4 text-center"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-400/30">
                      <Wrench className="h-5 w-5 text-amber-400" />
                    </span>
                    <span className="text-[12px] font-bold text-amber-300/90">{t('maintenance.title')}</span>
                    <span className="line-clamp-2 px-1 text-[10px] leading-snug text-amber-200/60">
                      {avatarVideoDisabledMessage}
                    </span>
                  </div>
                ))}

                {/* Limit reached card */}
                {quota?.enabled && !canCreate && (
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-4 text-white/40">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-center">
                      {t('quotaCard.title')}
                    </span>
                    <span className="text-[10px] text-center text-white/30 leading-tight">
                      {t('quotaCard.description')}
                    </span>
                  </div>
                )}

                {avatars.map((avatar) => (
                  <AvatarCard
                    key={avatar.id}
                    avatar={avatar}
                    isConfirming={confirmDeleteId === avatar.id}
                    isDeleting={deletingId === avatar.id}
                    onConfirmDelete={() => setConfirmDeleteId(avatar.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onDelete={() => handleDelete(avatar.id)}
                    onGenerateVideo={() => requestAvatarVideoForm({ avatar })}
                    videoDisabled={!avatarVideoEnabled}
                    videoDisabledMessage={avatarVideoDisabledMessage}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CreateAvatarModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleAvatarCreated}
      />
    </aside>
  );
}

// ─── Card component ─────────────────────────────────────────────────────────

interface AvatarCardProps {
  avatar: UserAvatar;
  isConfirming: boolean;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onGenerateVideo: () => void;
  videoDisabled?: boolean;
  videoDisabledMessage?: string;
  locale: string;
}

function AvatarCard({
  avatar,
  isConfirming,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  videoDisabled,
  videoDisabledMessage,
  onGenerateVideo,
  locale,
}: AvatarCardProps) {
  const t = useTranslations('editorDialogs.avatars.card');
  const tConfirm = useTranslations('editorDialogs.avatars.deleteConfirm');
  const status = avatar.status;
  const isReady = status === 'READY';
  const isFailed = status === 'FAILED';
  const isProcessing =
    status === 'PENDING' || status === 'SUBMITTING' || status === 'TRAINING';
  const isPendingConsent = status === 'PENDING_CONSENT';

  // Track media load failures so we fall back to the placeholder instead of
  // leaving a broken <img> with the alt text showing (HeyGen URLs expire).
  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  useEffect(() => {
    setImgError(false);
    setVideoError(false);
  }, [avatar.previewImageUrl, avatar.previewVideoUrl]);

  const showVideo = !!avatar.previewVideoUrl && !videoError;
  const showImage = !showVideo && !!avatar.previewImageUrl && !imgError;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all ${
        isReady
          ? 'border-white/[0.07] bg-[#1e2a2c]/40 hover:border-[#a2dd00]/30 hover:shadow-[0_8px_28px_-10px_rgba(162,221,0,0.35)]'
          : isFailed
            ? 'border-red-500/25 bg-red-500/[0.04]'
            : isPendingConsent
              ? 'border-yellow-400/25 bg-yellow-400/[0.03]'
              : 'border-white/[0.06] bg-[#1e2a2c]/40'
      }`}
    >
      {/* Preview */}
      <div className="relative aspect-square w-full overflow-hidden bg-[#0f1414]">
        {showVideo ? (
          <video
            src={avatar.previewVideoUrl ?? undefined}
            poster={!imgError ? avatar.previewImageUrl ?? undefined : undefined}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => e.currentTarget.pause()}
            onError={() => setVideoError(true)}
          />
        ) : showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatar.previewImageUrl ?? undefined}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#243032] via-[#1a2123] to-[#0f1414]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/[0.06]">
              <User className="h-6 w-6 text-white/25" strokeWidth={1.5} />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/25">
              {t('noPreview')}
            </span>
          </div>
        )}

        {/* Play hint overlay on hover for READY cards with video */}
        {isReady && showVideo && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" strokeWidth={0} />
            </span>
          </div>
        )}

        {/* "Pronto" badge with pulse — top-left, only when READY */}
        {isReady && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 ring-1 ring-[#a2dd00]/25 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#a2dd00]/70" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
            </span>
            <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-[#a2dd00]">
              {t('ready')}
            </span>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0f1414]/85 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]/85" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/75">
              {status === 'TRAINING' ? t('trainingTitle') : t('initiatingTitle')}
            </span>
            <span className="px-3 text-center text-[9px] leading-tight text-white/40">
              {status === 'TRAINING' ? t('trainingSubtitle') : t('initiatingSubtitle')}
            </span>
          </div>
        )}

        {/* Pending consent overlay */}
        {isPendingConsent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-yellow-500/15 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400/25 ring-1 ring-yellow-400/45">
              <AlertCircle className="h-4 w-4 text-yellow-300" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-yellow-300">
              {t('pendingConsent')}
            </span>
          </div>
        )}

        {/* Failed overlay */}
        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-950/55 backdrop-blur-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-400/45">
              <AlertCircle className="h-4 w-4 text-red-400" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-red-400">
              {t('failed')}
            </span>
          </div>
        )}

        {/* Delete button — top-right, on hover */}
        {!isConfirming && !isProcessing && status !== 'DELETING' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmDelete();
            }}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/70 backdrop-blur-md transition-all hover:bg-red-500/45 hover:text-red-200 sm:opacity-0 group-hover:opacity-100"
            title={t('delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-bold leading-tight text-white/90">
            {avatar.name}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-white/35">
            {isReady
              ? t('readyAt', { time: formatRelative(avatar.trainingCompletedAt ?? avatar.createdAt, locale) })
              : isFailed
                ? t('trainingFailed')
                : isPendingConsent
                  ? t('pendingConsentLabel')
                  : status === 'TRAINING'
                    ? t('training')
                    : t('initiating')}
          </div>
        </div>

        {isFailed && avatar.errorMessage && (
          <p className="line-clamp-2 rounded-md border border-red-500/15 bg-red-500/[0.07] px-2 py-1.5 text-[10px] leading-relaxed text-red-300/85">
            {avatar.errorMessage}
          </p>
        )}

        {isReady && (videoDisabled ? (
          <button
            type="button"
            disabled
            title={videoDisabledMessage}
            className="mt-auto flex h-8 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10.5px] font-extrabold text-amber-300/90"
          >
            <Wrench className="h-3 w-3" />
            {t('maintenance')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGenerateVideo}
            className="mt-auto flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00] text-[10.5px] font-extrabold text-black shadow-[0_2px_10px_-2px_rgba(162,221,0,0.4)] transition-all hover:bg-[#b6ec1f] hover:shadow-[0_4px_14px_-2px_rgba(162,221,0,0.55)]"
          >
            <Video className="h-3 w-3" />
            {t('generateVideo')}
          </button>
        ))}

        {isPendingConsent && avatar.consentUrl && (
          <a
            href={avatar.consentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-yellow-400/20 text-[10.5px] font-extrabold text-yellow-300 ring-1 ring-yellow-400/35 transition-colors hover:bg-yellow-400/30"
          >
            {t('approveConsent')}
          </a>
        )}
      </div>

      {/* Delete confirm overlay */}
      {isConfirming && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-red-500/40 bg-[#1a2123]/95 p-3 backdrop-blur-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/35">
            <Trash2 className="h-4 w-4 text-red-400" />
          </span>
          <p className="text-center text-[11.5px] font-bold text-white/85">{tConfirm('title')}</p>
          <p className="text-center text-[10px] leading-tight text-white/45">
            {tConfirm('subtitle')}
          </p>
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onDelete}
              className="flex h-7 items-center gap-1 rounded-md bg-red-500/25 px-2.5 text-[10px] font-extrabold text-red-300 transition-colors hover:bg-red-500/35 disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {tConfirm('confirm')}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onCancelDelete}
              className="flex h-7 items-center rounded-md px-2.5 text-[10px] font-extrabold text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white/90 disabled:opacity-60"
            >
              {tConfirm('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact relative time formatter. Uses pre-localized templates from the
 * "relativeTime" namespace so each locale can format naturally (e.g. "há 5 min"
 * vs "5 min ago" vs "hace 5 min"). Kept tiny on purpose — full
 * Intl.RelativeTimeFormat output is too verbose for the card label.
 */
const RELATIVE_DICT: Record<string, Record<string, string>> = {
  'pt-BR': {
    now: 'agora',
    min: 'há {n} min',
    hour: 'há {n} h',
    day: 'há {n} d',
    week: 'há {n} sem',
    month: 'há {n} mês',
    year: 'há {n} a',
  },
  en: {
    now: 'just now',
    min: '{n} min ago',
    hour: '{n} h ago',
    day: '{n} d ago',
    week: '{n} w ago',
    month: '{n} mo ago',
    year: '{n} y ago',
  },
  es: {
    now: 'ahora',
    min: 'hace {n} min',
    hour: 'hace {n} h',
    day: 'hace {n} d',
    week: 'hace {n} sem',
    month: 'hace {n} mes',
    year: 'hace {n} a',
  },
};

function formatRelative(iso: string, locale: string): string {
  const dict = RELATIVE_DICT[locale] ?? RELATIVE_DICT['pt-BR'];
  const fmt = (key: string, n: number) => dict[key].replace('{n}', String(n));
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return dict.now;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return dict.now;
  if (minutes < 60) return fmt('min', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fmt('hour', hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return fmt('day', days);
  if (days < 30) return fmt('week', Math.floor(days / 7));
  if (days < 365) return fmt('month', Math.floor(days / 30));
  return fmt('year', Math.floor(days / 365));
}
