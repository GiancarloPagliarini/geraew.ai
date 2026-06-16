'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, FolderOpen, Image as ImageIcon, ImageOff, LayoutGrid, Loader2, SquarePlay, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type GalleryItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { FilterPill } from '@/components/app/FilterPill';

const PAGE_SIZE = 30;
const IMAGE_TYPES = 'TEXT_TO_IMAGE,IMAGE_TO_IMAGE,FACE_SWAP,VIRTUAL_TRY_ON';
const VIDEO_TYPES = 'TEXT_TO_VIDEO,IMAGE_TO_VIDEO,MOTION_CONTROL,REFERENCE_VIDEO,SPOKEN_VIDEO';
/** Tipos publicáveis (imagem + vídeo — voz fica de fora). */
const PUBLISHABLE_TYPES = `${IMAGE_TYPES},${VIDEO_TYPES}`;

/** Filtros do topo do picker → tipos enviados à API. */
const PICKER_FILTERS: { id: 'all' | 'image' | 'video'; icon: typeof LayoutGrid; types: string }[] = [
  { id: 'all', icon: LayoutGrid, types: PUBLISHABLE_TYPES },
  { id: 'image', icon: ImageIcon, types: IMAGE_TYPES },
  { id: 'video', icon: SquarePlay, types: VIDEO_TYPES },
];

function isVideo(type: string) {
  const t = type.toUpperCase();
  return t.includes('VIDEO') || t.includes('MOTION');
}

/** Tile do picker: miniatura + prompt; sem preview cai no ícone padrão. */
function PickerTile({
  item,
  selected,
  onSelect,
}: {
  item: GalleryItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const video = isVideo(item.type);
  // vídeo só usa thumbnail (outputUrl é o .mp4, não serve em <img>); imagem usa qualquer um
  const image = video ? item.thumbnailUrl : item.thumbnailUrl || item.outputUrl;
  const [imgError, setImgError] = useState(false);
  const showImage = !!image && !imgError;
  const prompt = item.prompt?.trim();

  return (
    <button
      type="button"
      title={prompt || undefined}
      onClick={onSelect}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border text-left transition-all duration-200 ease-app',
        selected
          ? 'border-app-lime ring-2 ring-app-lime/40'
          : 'border-app-hairline hover:border-app-hairline-2',
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#1d2628,#161d1f)]" />
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image!}
          alt={prompt ?? ''}
          loading="lazy"
          onError={() => setImgError(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <ImageOff
          className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-app-muted"
          strokeWidth={1.6}
        />
      )}
      {video && (
        <SquarePlay className="absolute left-2 top-2 size-4 text-white drop-shadow" strokeWidth={2} />
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-app-lime">
          <Check className="size-4 text-app-lime-ink" strokeWidth={2.5} />
        </span>
      )}
      {/* prompt utilizado — sempre visível, com scrim na base */}
      {prompt && (
        <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(13,16,17,0.92),rgba(13,16,17,0.5)_55%,transparent)] px-2.5 pb-2 pt-6">
          <span className="line-clamp-2 text-[11px] font-medium leading-snug text-white/90">
            {prompt}
          </span>
        </span>
      )}
    </button>
  );
}

/** Modal "Publicar na comunidade": escolhe uma criação e envia para aprovação. */
export function SubmitPostModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('home');
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const types = PICKER_FILTERS.find((f) => f.id === filter)!.types;

  const close = () => {
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['community', 'submit-picker', filter],
    queryFn: ({ pageParam }) =>
      api.gallery.list(accessToken!, pageParam as number, PAGE_SIZE, { type: types }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta && last.meta.page * last.meta.limit < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  const items = useMemo(() => (data?.pages ?? []).flatMap((p) => p.data), [data]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const submitMutation = useMutation({
    mutationFn: (item: GalleryItem) =>
      api.community.submit(accessToken!, {
        generationId: item.id,
        ...(item.outputUrl && { outputUrl: item.outputUrl }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(t('community.submitSuccess'), {
        description: t('community.submitSuccessDesc'),
      });
      close();
    },
    onError: (err: unknown) => {
      const message = (err as { message?: string })?.message;
      toast.error(message || t('community.submitError'));
    },
  });

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.7)] backdrop-blur-[6px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('community.submitTitle')}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto mt-[8vh] flex max-h-[80vh] w-[min(860px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {/* cabeçalho */}
        <div className="flex items-start gap-3 border-b border-app-hairline px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold text-app-text">{t('community.submitTitle')}</h2>
            <p className="mt-0.5 text-[13.5px] text-app-text-2">{t('community.submitSubtitle')}</p>
          </div>
          <button
            type="button"
            aria-label={t('palette.close')}
            onClick={close}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        {/* filtros */}
        <div className="flex items-center gap-2 border-b border-app-hairline px-6 py-3">
          {PICKER_FILTERS.map(({ id, icon }) => (
            <FilterPill
              key={id}
              active={filter === id}
              onClick={() => {
                setFilter(id);
                setSelected(null);
              }}
              icon={icon}
              className="!py-1.5 text-[13px]"
            >
              {t(`community.filters.${id}`)}
            </FilterPill>
          ))}
        </div>

        {/* grade de criações */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-app">
          {isPending ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="aspect-square skeleton-app rounded-xl bg-app-surface" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={t('community.pickerEmpty')}
              hint={t('community.pickerEmptyHint')}
              className="border-0 bg-transparent"
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {items.map((item) => (
                  <PickerTile
                    key={`${item.id}-${item.outputUrl ?? ''}`}
                    item={item}
                    selected={selected?.id === item.id && selected.outputUrl === item.outputUrl}
                    onSelect={() => setSelected(item)}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="flex justify-center py-4">
                {isFetchingNextPage && (
                  <Loader2 className="size-5 animate-spin text-app-muted" strokeWidth={1.8} />
                )}
              </div>
            </>
          )}
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-between gap-4 border-t border-app-hairline px-6 py-4">
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-app-muted">
            {selected?.prompt?.trim() || t('community.submitHint')}
          </p>
          <button
            type="button"
            disabled={!selected || submitMutation.isPending}
            onClick={() => selected && submitMutation.mutate(selected)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-app-lime px-5 text-[13.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:opacity-50"
          >
            {submitMutation.isPending && <Loader2 className="size-4 animate-spin" strokeWidth={2} />}
            {t('community.submitCta')}
          </button>
        </div>
      </div>
    </div>
  );
}
