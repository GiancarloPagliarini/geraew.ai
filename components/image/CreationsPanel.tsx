'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Grid2x2, Heart, Search, X } from 'lucide-react';
import { cn, normalizeSearch } from '@/lib/utils';
import { api, type GalleryItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { FilterPill } from '@/components/app/FilterPill';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { Lightbox } from '@/components/gallery/Lightbox';
import { SKELETON_HEIGHTS, SkeletonCard } from '@/components/gallery/GallerySkeletons';
import { GALLERY_FILTERS } from '@/components/gallery/kind';
import { EmptyState } from '@/components/app/EmptyState';
import { GenerationPreview } from '@/components/editor/GenerationPreview';
import type { PendingGeneration } from '@/components/image/types';
import { FolderOpen } from 'lucide-react';

const PAGE_LIMIT = 30;

interface CreationsPanelProps {
  /** gerações em andamento — previews aurora no topo do grid, com reveal ao concluir */
  pending?: PendingGeneration[];
  /** filtro inicial (ex.: 'image' na tela de gerar imagens) */
  defaultFilter?: string;
  /** chamado pelo CTA do estado vazio (ex.: focar o prompt) */
  onCreateNew?: () => void;
}

/** Preview de geração: aurora enquanto processa; ao receber a url, a imagem
 *  esmaece por cima (mesmo efeito do painel do workspace). */
function PendingPreview({ gen }: { gen: PendingGeneration }) {
  const t = useTranslations('home');
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <GenerationPreview
        genState={gen.url ? 'done' : 'generating'}
        imageVisible={visible && !!gen.url}
        progress={0}
        proportion="1-1"
        generatedImageUrl={gen.url ?? null}
        onImageLoad={() => setVisible(true)}
        onImageError={() => setVisible(true)}
      />
      <p className="mt-2.5 truncate text-[14px] font-semibold text-app-text">{gen.prompt}</p>
      <p className="mt-0.5 font-mono text-[12px] text-app-muted">{t('image.generating')}</p>
    </div>
  );
}

/** Lista as criações da galeria do usuário dentro das telas de geração. */
export function CreationsPanel({
  pending = [],
  defaultFilter = 'all',
  onCreateNew,
}: CreationsPanelProps) {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const [filter, setFilter] = useState(defaultFilter);
  const [favOnly, setFavOnly] = useState(false);
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
      queryKey: ['image-creations', filter, favOnly],
      queryFn: ({ pageParam }) =>
        api.gallery.list(accessToken!, pageParam, PAGE_LIMIT, {
          ...(types ? { type: types } : {}),
          ...(favOnly ? { favorited: true } : {}),
        }),
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
      enabled: !!accessToken && !!user,
      staleTime: 15_000,
    });

  const items = useMemo(() => {
    let all = data?.pages.flatMap((p) => p.data) ?? [];
    // enquanto o preview de uma geração concluída está revelando, o mesmo item
    // já pode ter entrado na lista — esconde para não duplicar
    if (pending.length > 0) {
      const pendingKeys = new Set(pending.map((p) => p.key));
      all = all.filter((i) => !pendingKeys.has(i.id));
    }
    const q = normalizeSearch(query.trim());
    if (!q) return all;
    return all.filter((i) => normalizeSearch(i.prompt ?? '').includes(q));
  }, [data, query, pending]);

  // scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: scrollRef.current, rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* cabeçalho */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-4">
        <Grid2x2 className="size-[17px] text-app-lime" strokeWidth={1.8} />
        <h2 className="text-[15px] font-semibold text-app-text">{t('image.creations')}</h2>

        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          {/* filtros por tipo: ativo mostra label, inativos só ícone */}
          {GALLERY_FILTERS.map(({ id, icon: Icon }) =>
            filter === id ? (
              <FilterPill key={id} active onClick={() => setFilter(id)} icon={Icon} className="px-3.5 py-1.5 text-[12.5px]">
                {t(`gallery.filters.${id}`)}
              </FilterPill>
            ) : (
              <button
                key={id}
                type="button"
                aria-label={t(`gallery.filters.${id}`)}
                title={t(`gallery.filters.${id}`)}
                onClick={() => setFilter(id)}
                className="flex size-8 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
              >
                <Icon className="size-[15px]" strokeWidth={1.8} />
              </button>
            ),
          )}

          <div className="mx-1 h-5 w-px bg-app-hairline" />

          {/* favoritos */}
          <button
            type="button"
            aria-label={t('image.favorites')}
            title={t('image.favorites')}
            onClick={() => setFavOnly((v) => !v)}
            className={cn(
              'flex size-8 items-center justify-center rounded-full transition-colors duration-200 ease-app',
              favOnly ? 'bg-app-surface text-app-lime' : 'text-app-text-2 hover:bg-app-surface hover:text-app-text',
            )}
          >
            <Heart className="size-[15px]" strokeWidth={1.8} fill={favOnly ? 'currentColor' : 'none'} />
          </button>

          {/* busca */}
          {searchOpen ? (
            <div className="flex h-8 w-[200px] items-center gap-2 rounded-full border border-app-hairline bg-app-surface px-3 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
              <Search className="size-3.5 shrink-0 text-app-muted" strokeWidth={1.8} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('gallery.searchPlaceholder')}
                className="w-full bg-transparent text-[12.5px] text-app-text outline-none placeholder:text-app-muted"
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
                <X className="size-3.5" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={t('gallery.searchPlaceholder')}
              onClick={() => setSearchOpen(true)}
              className="flex size-8 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <Search className="size-[15px]" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* conteúdo */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-app">
        {isPending ? (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {SKELETON_HEIGHTS.slice(0, 9).map((h, i) => (
              <SkeletonCard key={i} height={h} index={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState icon={FolderOpen} title={t('gallery.loadError')} />
        ) : items.length === 0 && pending.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-[64px] items-center justify-center rounded-[16px] border border-app-hairline bg-app-surface">
              <FolderOpen className="size-7 text-app-text-2" strokeWidth={1.6} />
            </span>
            <p className="text-[16px] font-bold text-app-text">{t('image.creationsEmpty')}</p>
            <button
              type="button"
              onClick={onCreateNew}
              className="text-[14px] font-semibold text-app-lime transition-colors duration-200 ease-app hover:text-app-lime-bright"
            >
              {t('image.creationsEmptyCta')}
            </button>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {/* gerações em andamento — mesmo efeito aurora do workspace */}
            {pending.map((gen) => (
              <div key={gen.key} className="mb-5 animate-card-in break-inside-avoid">
                <PendingPreview gen={gen} />
              </div>
            ))}
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} onOpen={openLightbox} />
            ))}
            {isFetchingNextPage &&
              SKELETON_HEIGHTS.slice(0, 6).map((h, i) => (
                <SkeletonCard key={`next-${i}`} height={h} index={i} />
              ))}
          </div>
        )}
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
