'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FolderOpen, Search, X } from 'lucide-react';
import { normalizeSearch } from '@/lib/utils';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<number | undefined>(undefined);
  const [lightboxClosing, setLightboxClosing] = useState(false);
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

  const items = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.data) ?? [];
    const q = normalizeSearch(query.trim());
    if (!q) return all;
    return all.filter((i) => normalizeSearch(i.prompt ?? '').includes(q));
  }, [data, query]);

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
          <div className="flex items-center gap-2">
            {/* filtros por tipo */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GALLERY_FILTERS.map(({ id, icon }) => (
                <FilterPill key={id} active={filter === id} onClick={() => selectFilter(id)} icon={icon}>
                  {t(`gallery.filters.${id}`)}
                </FilterPill>
              ))}
            </div>

            {/* busca expansível */}
            {searchOpen ? (
              <div className="flex h-10 w-full max-w-[280px] items-center gap-2 rounded-full border border-app-hairline bg-app-surface px-3.5 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
                <Search className="size-4 shrink-0 text-app-muted" strokeWidth={1.8} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('gallery.searchPlaceholder')}
                  className="w-full bg-transparent text-[13.5px] text-app-text outline-none placeholder:text-app-muted"
                />
                <button
                  type="button"
                  aria-label={t('palette.close')}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery('');
                  }}
                  className="text-app-muted transition-colors duration-200 ease-app hover:text-app-text"
                >
                  <X className="size-4" strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={t('gallery.searchPlaceholder')}
                onClick={() => setSearchOpen(true)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
              >
                <Search className="size-[18px]" strokeWidth={1.8} />
              </button>
            )}
          </div>

          {/* total */}
          {isPending ? (
            <div className="mt-2.5 h-3 w-[90px] animate-pulse rounded bg-app-surface" />
          ) : (
            !isError && (
              <p className="mt-2.5 px-1 font-mono text-[12px] text-app-muted">
                {t('gallery.count', {
                  count: query.trim() ? items.length : (data?.pages[0]?.meta.total ?? 0),
                })}
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
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} onOpen={openLightbox} />
            ))}
            {/* skeletons da próxima página entram no próprio masonry */}
            {isFetchingNextPage &&
              SKELETON_HEIGHTS.slice(0, 8).map((h, i) => (
                <SkeletonCard key={`next-${i}`} height={h} index={i} />
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
