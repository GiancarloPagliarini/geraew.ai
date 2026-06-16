'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  Loader2,
  ScanFace,
  Trash2,
  UserPlus,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type UserAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { CreateAvatarModal } from '@/components/editor/CreateAvatarModal';
import { AvatarVideoPanel } from '@/components/avatar/AvatarVideoPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const POLL_INTERVAL_MS = 5000;

const selectTriggerClass =
  "w-full shrink-0 !h-11 rounded-[10px] border-app-hairline bg-app-surface px-3.5 text-[14px] font-semibold text-app-text shadow-none transition-colors duration-200 ease-app hover:border-app-hairline-2 focus-visible:border-[rgba(162,221,0,0.4)] focus-visible:ring-0 dark:bg-app-surface dark:hover:bg-app-surface [&_svg:not([class*='text-'])]:text-app-muted";
const selectContentClass =
  'rounded-xl border-app-hairline-2 bg-app-card text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]';
const selectItemClass =
  'rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text';

type AvatarToolId = 'create' | 'video';
const TOOLS: { id: AvatarToolId; labelKey: 'toolCreate' | 'toolVideo'; icon: LucideIcon }[] = [
  { id: 'create', labelKey: 'toolCreate', icon: UserPlus },
  { id: 'video', labelKey: 'toolVideo', icon: Video },
];

/** Tempo relativo curto usando os templates pré-localizados (relativeTime.*). */
function useRelative() {
  const t = useTranslations('editorDialogs.avatars.relativeTime');
  return (iso: string | null) => {
    if (!iso) return '';
    const diff = Math.max(0, (typeof window !== 'undefined' ? Date.now() : 0) - new Date(iso).getTime());
    const min = Math.floor(diff / 60000);
    if (min < 1) return t('now');
    if (min < 60) return t('min', { n: min });
    const h = Math.floor(min / 60);
    if (h < 24) return t('hour', { n: h });
    const d = Math.floor(h / 24);
    if (d < 7) return t('day', { n: d });
    const w = Math.floor(d / 7);
    if (w < 5) return t('week', { n: w });
    const mo = Math.floor(d / 30);
    if (mo < 12) return t('month', { n: mo });
    return t('year', { n: Math.floor(d / 365) });
  };
}

function AvatarCard({
  avatar,
  onDelete,
}: {
  avatar: UserAvatar;
  onDelete: (id: string) => Promise<void>;
}) {
  const t = useTranslations('editorDialogs.avatars.card');
  const tConfirm = useTranslations('editorDialogs.avatars.deleteConfirm');
  const rel = useRelative();
  const status = avatar.status;
  const isReady = status === 'READY';
  const isFailed = status === 'FAILED';
  const isProcessing = status === 'PENDING' || status === 'SUBMITTING' || status === 'TRAINING';
  const isPendingConsent = status === 'PENDING_CONSENT';

  const [imgError, setImgError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setImgError(false);
    setVideoError(false);
  }, [avatar.previewImageUrl, avatar.previewVideoUrl]);

  const showVideo = !!avatar.previewVideoUrl && !videoError;
  const showImage = !showVideo && !!avatar.previewImageUrl && !imgError;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[16px] border bg-app-surface transition-colors duration-200 ease-app',
        isReady ? 'border-app-hairline hover:border-app-lime/40' : 'border-app-hairline',
        isFailed && 'border-red-500/25',
        isPendingConsent && 'border-yellow-400/25',
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-app-bg">
        {showVideo ? (
          <video
            src={avatar.previewVideoUrl ?? undefined}
            poster={!imgError ? avatar.previewImageUrl ?? undefined : undefined}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => e.currentTarget.pause()}
            onError={() => setVideoError(true)}
          />
        ) : showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.previewImageUrl ?? undefined}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5">
            <ScanFace className="size-7 text-app-muted" strokeWidth={1.4} />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-muted">
              {t('noPreview')}
            </span>
          </div>
        )}

        {isReady && (
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 ring-1 ring-app-lime/25 backdrop-blur-md">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-app-lime/70" />
              <span className="relative size-1.5 rounded-full bg-app-lime" />
            </span>
            <span className="text-[8.5px] font-extrabold uppercase tracking-[0.16em] text-app-lime">
              {t('ready')}
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-app-bg/85 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-app-lime/85" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-app-text">
              {status === 'TRAINING' ? t('trainingTitle') : t('initiatingTitle')}
            </span>
            <span className="px-3 text-center text-[9px] leading-tight text-app-muted">
              {status === 'TRAINING' ? t('trainingSubtitle') : t('initiatingSubtitle')}
            </span>
          </div>
        )}

        {isPendingConsent && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-yellow-500/15 backdrop-blur-sm">
            <AlertCircle className="size-6 text-yellow-300" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-yellow-300">
              {t('pendingConsent')}
            </span>
          </div>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-950/55 backdrop-blur-sm">
            <AlertCircle className="size-6 text-red-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-red-400">
              {t('failed')}
            </span>
          </div>
        )}

        {!confirming && !isProcessing && status !== 'DELETING' && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t('delete')}
            className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/55 text-white/70 backdrop-blur-md transition-all hover:bg-red-500/45 hover:text-red-200 sm:opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight text-app-text">{avatar.name}</p>
          <p className="mt-0.5 truncate text-[10.5px] text-app-muted">
            {isReady
              ? t('readyAt', { time: rel(avatar.trainingCompletedAt ?? avatar.createdAt) })
              : isFailed
                ? t('trainingFailed')
                : isPendingConsent
                  ? t('pendingConsentLabel')
                  : status === 'TRAINING'
                    ? t('training')
                    : t('initiating')}
          </p>
        </div>

        {isFailed && avatar.errorMessage && (
          <p className="line-clamp-2 rounded-md border border-red-500/15 bg-red-500/[0.07] px-2 py-1.5 text-[10px] leading-relaxed text-red-300/85">
            {avatar.errorMessage}
          </p>
        )}

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

      {confirming && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-red-500/40 bg-app-card/95 p-3 backdrop-blur-md">
          <span className="flex size-9 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/35">
            <Trash2 className="size-4 text-red-400" />
          </span>
          <p className="text-center text-[11.5px] font-bold text-app-text">{tConfirm('title')}</p>
          <p className="text-center text-[10px] leading-tight text-app-muted">{tConfirm('subtitle')}</p>
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete(avatar.id);
                } finally {
                  setDeleting(false);
                }
              }}
              className="flex h-7 items-center gap-1 rounded-md bg-red-500/25 px-2.5 text-[10px] font-extrabold text-red-300 transition-colors hover:bg-red-500/35 disabled:opacity-60"
            >
              {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              {tConfirm('confirm')}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirming(false)}
              className="flex h-7 items-center rounded-md px-2.5 text-[10px] font-extrabold text-app-text-2 transition-colors hover:bg-app-surface disabled:opacity-60"
            >
              {tConfirm('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AvatarView() {
  const t = useTranslations('editorDialogs.avatars');
  const tAvatar = useTranslations('home.avatar');
  const tHome = useTranslations('home');
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [tool, setTool] = useState<AvatarToolId>('create');
  const [selectedReadyId, setSelectedReadyId] = useState<string>('');
  // mobile: alterna entre a config (criar/gerar) e a lista de avatares
  const [mobileView, setMobileView] = useState<'config' | 'list'>('config');

  // gate de manutenção do avatar-video (admin pode desligar)
  const { data: videoModels } = useQuery({
    queryKey: ['models', 'video'],
    queryFn: () => api.models.listVideos(),
    staleTime: 60_000,
  });
  const avatarVideoModel = videoModels?.find((m) => m.slug === 'avatar-video');
  const videoDisabled = avatarVideoModel?.isActive === false;
  const videoDisabledMessage = avatarVideoModel?.statusMessage ?? t('maintenance.defaultMessage');

  // Lista de avatares — useQuery dedupa chamadas e mantém os dados anteriores
  // durante o refetch (keepPreviousData), evitando o "piscar" do skeleton.
  // Faz polling apenas quando há avatar em processamento.
  const avatarsQuery = useQuery({
    queryKey: ['avatars'],
    queryFn: () => api.avatars.list(accessToken as string),
    enabled: !!user && !!accessToken,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const list = query.state.data?.avatars ?? [];
      const transient = list.some(
        (a) => a.status === 'PENDING' || a.status === 'SUBMITTING' || a.status === 'TRAINING',
      );
      return transient ? POLL_INTERVAL_MS : false;
    },
  });

  const avatars = useMemo(() => avatarsQuery.data?.avatars ?? [], [avatarsQuery.data]);
  const quota = avatarsQuery.data?.quota ?? null;
  // Só mostra skeleton na primeira carga (sem dados antigos para exibir).
  const loading = avatarsQuery.isLoading;
  const error = avatarsQuery.isError;

  type AvatarsData = Awaited<ReturnType<typeof api.avatars.list>>;

  const readyAvatars = useMemo(() => avatars.filter((a) => a.status === 'READY'), [avatars]);
  const selectedReadyAvatar = useMemo(
    () => readyAvatars.find((a) => a.id === selectedReadyId) ?? null,
    [readyAvatars, selectedReadyId],
  );

  const handleCreated = (created: UserAvatar) => {
    queryClient.setQueryData<AvatarsData>(['avatars'], (old) =>
      old ? { ...old, avatars: [created, ...old.avatars] } : old,
    );
    void avatarsQuery.refetch();
    // no mobile, mostra a lista para o usuário ver o avatar recém-criado processando
    setMobileView('list');
  };

  const handleDelete = async (avatarId: string) => {
    if (!accessToken) return;
    try {
      await api.avatars.delete(accessToken, avatarId);
      queryClient.setQueryData<AvatarsData>(['avatars'], (old) =>
        old ? { ...old, avatars: old.avatars.filter((a) => a.id !== avatarId) } : old,
      );
      void avatarsQuery.refetch();
      toast.success(t('deleteSuccess'));
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* mobile: alternância entre config (criar/gerar) e lista de avatares */}
      <div className="flex shrink-0 gap-1 border-b border-app-hairline p-2 lg:hidden">
        {(['config', 'list'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={cn(
              'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors duration-200 ease-app',
              mobileView === view ? 'bg-app-surface text-app-text' : 'text-app-text-2 hover:text-app-text',
            )}
          >
            {view === 'config' ? tHome('image.viewConfig') : t('sectionTitle')}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* ── Painel de configuração (esquerda) ── */}
      <div
        className={cn(
          'flex w-full min-h-0 flex-1 flex-col border-app-hairline lg:w-[400px] lg:flex-none lg:border-r',
          mobileView === 'list' && 'max-lg:hidden',
        )}
      >
        {/* seletor de ferramenta */}
        <div className="shrink-0 border-b border-app-hairline p-4">
          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
            {tAvatar('tool')}
          </span>
          <Select value={tool} onValueChange={(v) => setTool(v as AvatarToolId)}>
            <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {TOOLS.map(({ id, labelKey, icon: Icon }) => (
                <SelectItem key={id} value={id} className={selectItemClass}>
                  <Icon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  {tAvatar(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* conteúdo da ferramenta */}
        <div className="flex min-h-0 flex-1 flex-col">
          {tool === 'create' ? (
            <CreateAvatarModal embedded open onClose={() => {}} onCreated={handleCreated} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* seletor de avatar — fixo no topo */}
              <div className="shrink-0 border-b border-app-hairline p-4">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                  {tAvatar('selectAvatar')}
                </span>
                {readyAvatars.length === 0 ? (
                  <p className="rounded-[10px] border border-app-hairline bg-app-surface px-3.5 py-3 text-[13px] text-app-text-2">
                    {tAvatar('noReady')}
                  </p>
                ) : (
                  <Select value={selectedReadyId} onValueChange={setSelectedReadyId}>
                    <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
                      <SelectValue placeholder={tAvatar('selectAvatarPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                      {readyAvatars.map((a) => (
                        <SelectItem key={a.id} value={a.id} className={selectItemClass}>
                          <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-card">
                            {a.previewImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.previewImageUrl} alt="" className="size-full object-cover" />
                            ) : (
                              <ScanFace className="size-3 text-app-muted" strokeWidth={1.8} />
                            )}
                          </span>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* formulário de geração — inline, sem redirecionar ao workspace */}
              {selectedReadyAvatar ? (
                <AvatarVideoPanel
                  key={selectedReadyAvatar.id}
                  avatar={selectedReadyAvatar}
                  videoDisabled={videoDisabled}
                  videoDisabledMessage={videoDisabledMessage}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-6">
                  <p className="max-w-[260px] text-center text-[12.5px] leading-relaxed text-app-muted">
                    {readyAvatars.length === 0 ? tAvatar('generateHint') : tAvatar('selectAvatarPlaceholder')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Avatares existentes (direita) ── */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          mobileView === 'config' && 'max-lg:hidden',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-app-hairline px-6 py-4">
          <h2 className="text-[16px] font-bold text-app-text">{t('sectionTitle')}</h2>
          {quota && quota.enabled && (
            <span className="rounded-full border border-app-hairline bg-app-surface px-3 py-1 text-[12px] font-semibold text-app-text-2">
              {quota.used} / {quota.limit}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-app">
          {loading ? (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-[16px] border border-app-hairline">
                  <div className="aspect-square skeleton-app bg-app-surface" />
                  <div className="p-3">
                    <div className="h-3.5 w-2/3 skeleton-app rounded bg-app-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title={t('errorLoad')}
              cta={{ label: t('retry'), onClick: () => void avatarsQuery.refetch() }}
            />
          ) : avatars.length === 0 ? (
            <EmptyState
              icon={ScanFace}
              title={t('createCard.emptyTitle')}
              hint={t('createCard.emptyDescription')}
            />
          ) : (
            <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
              {avatars.map((avatar) => (
                <AvatarCard key={avatar.id} avatar={avatar} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
