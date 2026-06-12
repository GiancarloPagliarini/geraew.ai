'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, SquarePlay, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type GalleryItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { FolderOpen } from 'lucide-react';

const PAGE_SIZE = 30;
/** Tipos publicáveis (imagem + vídeo — voz fica de fora). */
const PUBLISHABLE_TYPES =
  'TEXT_TO_IMAGE,IMAGE_TO_IMAGE,FACE_SWAP,VIRTUAL_TRY_ON,TEXT_TO_VIDEO,IMAGE_TO_VIDEO,MOTION_CONTROL,REFERENCE_VIDEO,SPOKEN_VIDEO';

function isVideo(type: string) {
  const t = type.toUpperCase();
  return t.includes('VIDEO') || t.includes('MOTION');
}

/** Modal "Publicar na comunidade": escolhe uma criação e envia para aprovação. */
export function SubmitPostModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('home');
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    queryKey: ['community', 'submit-picker'],
    queryFn: ({ pageParam }) =>
      api.gallery.list(accessToken!, pageParam as number, PAGE_SIZE, { type: PUBLISHABLE_TYPES }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta && last.meta.page * last.meta.limit < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  const items = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.data).filter((i) => i.outputUrl || i.thumbnailUrl),
    [data],
  );

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
                {items.map((item) => {
                  const thumb = item.thumbnailUrl || item.outputUrl;
                  const isSelected = selected?.id === item.id && selected.outputUrl === item.outputUrl;
                  return (
                    <button
                      key={`${item.id}-${item.outputUrl ?? ''}`}
                      type="button"
                      onClick={() => setSelected(item)}
                      className={cn(
                        'group relative aspect-square overflow-hidden rounded-xl border transition-all duration-200 ease-app',
                        isSelected
                          ? 'border-app-lime ring-2 ring-app-lime/40'
                          : 'border-app-hairline hover:border-app-hairline-2',
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb!}
                        alt={item.prompt ?? ''}
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover"
                      />
                      {isVideo(item.type) && (
                        <SquarePlay
                          className="absolute left-2 top-2 size-4 text-white drop-shadow"
                          strokeWidth={2}
                        />
                      )}
                      {isSelected && (
                        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-app-lime">
                          <Check className="size-4 text-app-lime-ink" strokeWidth={2.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
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
            {t('community.submitHint')}
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
