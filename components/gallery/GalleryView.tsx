'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react';
import { api, type GalleryItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { FilterPill } from '@/components/app/FilterPill';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { Lightbox } from '@/components/gallery/Lightbox';
import { SKELETON_HEIGHTS, SkeletonCard, SkeletonMasonry } from '@/components/gallery/GallerySkeletons';
import { GALLERY_FILTERS } from '@/components/gallery/kind';

const PAGE_LIMIT = 30;

export function GalleryView() {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<number | undefined>(undefined);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  // nº de colunas do masonry — calculado pela largura real (round-robin estável,
  // sem o reembaralhamento do CSS `columns` quando as imagens carregam)
  const [columns, setColumns] = useState(4);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lightboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openLightbox = (item: GalleryItem, ratio?: number) => {
    if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    setLightboxClosing(false);
    setSelectedRatio(ratio);
    setSelected(item);
  };

  const closeLightbox = () => {
    setLightboxClosing(true);
    lightboxTimer.current = setTimeout(() => {
      setSelected(null);
      setLightboxClosing(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    };
  }, []);

  const types = GALLERY_FILTERS.find((f) => f.id === filter)?.types;

  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['gallery', 'masonry', filter],
      queryFn: ({ pageParam }) =>
        api.gallery.list(accessToken!, pageParam, PAGE_LIMIT, types ? { type: types } : undefined),
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
      enabled: !!accessToken && !!user,
      staleTime: 30_000,
    });

  const items = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

  // colunas responsivas pela largura do container (uma vez ao observar)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setColumns(w < 560 ? 1 : w < 880 ? 2 : w < 1200 ? 3 : 4);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // distribui itens (+ skeletons da próxima página) em colunas round-robin.
  // Cada item fica fixo na sua coluna — ao carregar as imagens as colunas só
  // crescem na vertical, sem os itens pularem de coluna.
  const columnsData = useMemo(() => {
    type Entry = { kind: 'item'; item: GalleryItem } | { kind: 'skeleton'; height: number };
    const entries: Entry[] = items.map((item) => ({ kind: 'item', item }));
    if (isFetchingNextPage) {
      SKELETON_HEIGHTS.slice(0, 8).forEach((height) => entries.push({ kind: 'skeleton', height }));
    }
    const cols: Entry[][] = Array.from({ length: columns }, () => []);
    entries.forEach((entry, i) => cols[i % columns].push(entry));
    return cols;
  }, [items, isFetchingNextPage, columns]);

  // scroll infinito: busca a próxima página quando o sentinela se aproxima
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollRef.current, rootMargin: '800px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const selectFilter = (id: string) => {
    setFilter(id);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    // toda a área é o container de scroll; filtros ficam sticky no topo
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-10 lg:px-11">
        <div className="sticky top-0 z-10 bg-app-bg pb-3 pt-6">
          {/* filtros por tipo */}
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GALLERY_FILTERS.map(({ id, icon }) => (
              <FilterPill key={id} active={filter === id} onClick={() => selectFilter(id)} icon={icon}>
                {t(`gallery.filters.${id}`)}
              </FilterPill>
            ))}
          </div>

          {/* total */}
          {isPending ? (
            <div className="mt-2.5 h-3 w-[90px] skeleton-app rounded bg-app-surface" />
          ) : (
            !isError && (
              <p className="mt-2.5 px-1 font-mono text-[12px] text-app-muted">
                {t('gallery.count', { count: data?.pages[0]?.meta.total ?? 0 })}
              </p>
            )
          )}
        </div>

        {isPending ? (
          <SkeletonMasonry />
        ) : isError ? (
          <EmptyState icon={FolderOpen} title={t('gallery.loadError')} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t('gallery.empty')}
            cta={{ label: t('gallery.emptyCta'), href: '/workspace' }}
          />
        ) : (
          <div className="flex gap-5">
            {columnsData.map((col, ci) => (
              <div key={ci} className="flex min-w-0 flex-1 flex-col">
                {col.map((entry, ri) =>
                  entry.kind === 'item' ? (
                    <GalleryCard key={entry.item.id} item={entry.item} onOpen={openLightbox} />
                  ) : (
                    <SkeletonCard key={`skel-${ci}-${ri}`} height={entry.height} index={ri} />
                  ),
                )}
              </div>
            ))}
          </div>
        )}
        {/* sentinela do scroll infinito */}
        <div ref={sentinelRef} className="h-px" />
      </div>

      {selected && (
        <Lightbox
          item={selected}
          ratio={selectedRatio}
          closing={lightboxClosing}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}
