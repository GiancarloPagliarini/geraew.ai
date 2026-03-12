'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Coins,
  Download,
  Expand,
  Heart,
  ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Play,
  ScanFace, Settings, X
} from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { api, Generation, GenerationInputImage } from '@/lib/api';

const PAGE_SIZE = 6;
const FIVE_MIN = 5 * 60 * 1000;

interface GalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GalleryDialog({ open, onOpenChange }: GalleryDialogProps) {
  const { accessToken } = useAuth();
  const [selected, setSelected] = useState<Generation | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Infinite list ──────────────────────────────────────────────────────────

  const {
    data,
    isLoading: galleryLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['gallery', 'list'],
    queryFn: ({ pageParam }) => api.gallery.list(accessToken!, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!accessToken && open,
    staleTime: FIVE_MIN,
  });

  // Flatten pages into a single list
  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gallery', 'stats'],
    queryFn: () => api.gallery.stats(accessToken!),
    enabled: !!accessToken && open,
    staleTime: FIVE_MIN,
  });

  // ── IntersectionObserver — trigger next page ───────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage(); },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reset scroll when closing or opening detail
  useEffect(() => {
    if (!selected) scrollRef.current?.scrollTo({ top: 0 });
  }, [selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#f3f0ed]/8 bg-[#1a2123] text-[#f3f0ed] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col **:data-[slot=dialog-close]:text-[#f3f0ed]/50 **:data-[slot=dialog-close]:hover:text-[#f3f0ed]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f3f0ed]">
            <ImageIcon className="h-5 w-5 text-[#a2dd00]" />
            Galeria
          </DialogTitle>
          <DialogDescription className="text-[#f3f0ed]/40">
            Suas imagens e vídeos gerados com IA
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        {!selected && (
          <div className="grid grid-cols-4 gap-2 shrink-0">
            <StatCard icon={Settings} label="Gerações" value={stats?.totalGenerations} loading={statsLoading} />
            <StatCard icon={Coins} label="Créditos usados" value={stats?.totalCreditsUsed} loading={statsLoading} />
            <StatCard icon={Heart} label="Favoritos" value={stats?.favoriteCount} loading={statsLoading} />
            <StatCard icon={ImagePlus} label="Imagens" value={stats?.generationsByType?.TEXT_TO_IMAGE} loading={statsLoading} />
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="overflow-y-auto sidebar-scroll flex-1 -mx-1 px-1">
          {selected ? (
            <DetailView item={selected} onBack={() => setSelected(null)} />
          ) : galleryLoading ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                {items.map((item) => (
                  <GalleryItem key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>

              {/* Sentinel — observed to trigger next page load */}
              <div ref={sentinelRef} className="h-4" />

              {/* Loading indicator for next page */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#a2dd00]/50" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!selected && !galleryLoading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/7 pt-3 -mx-6 px-6">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {items.length} de {total} {total === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({ item, onBack }: { item: Generation; onBack: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<GenerationInputImage | null>(null);

  const outputs = item.outputs ?? [];
  const activeOutput = outputs[activeIndex];
  const url = activeOutput?.url;
  const isVideo = !!item.durationSeconds;
  const hasRefs = (item.inputImages?.length ?? 0) > 0;
  const multipleOutputs = outputs.length > 1;

  // Reset loaded state when switching output
  function handleSelect(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setLoaded(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar para galeria
      </button>

      {/* Main player */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#f3f0ed]/3 max-h-[50vh]">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-[#f3f0ed]/6" />}

        {isVideo ? (
          <video
            key={url}
            src={url}
            controls
            preload="metadata"
            className={`w-full rounded-xl bg-black max-h-[50vh] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={() => setLoaded(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={item.prompt ?? 'Imagem gerada'}
            loading="lazy"
            decoding="async"
            className={`w-full rounded-xl object-contain max-h-[50vh] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Output counter badge */}
        {multipleOutputs && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-[10px] font-bold text-white">{activeIndex + 1} / {outputs.length}</span>
          </div>
        )}
      </div>

      {/* Output thumbnails strip */}
      {multipleOutputs && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
              {outputs.length} versões geradas
            </span>
          </div>
          <div className="flex gap-2 pt-1 pb-2">
            {outputs.map((output, i) => (
              <OutputThumb
                key={output.id}
                url={output.url}
                index={i}
                isVideo={isVideo}
                isActive={i === activeIndex}
                onClick={() => handleSelect(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Metadata + download */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {item.prompt && (
            <p className="text-sm text-[#f3f0ed]/70 line-clamp-3">{item.prompt}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-[#f3f0ed]/30 font-medium tracking-wider">
            {item.resolution && <span>{item.resolution}</span>}
            {item.durationSeconds && <span>{item.durationSeconds}s</span>}
            {item.modelUsed && <span>{item.modelUsed}</span>}
            {item.creditsConsumed > 0 && <span>{item.creditsConsumed} créditos</span>}
            {item.createdAt && (
              <span>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>

        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 rounded-lg bg-[#a2dd00]/10 px-3 py-1.5 text-xs font-medium text-[#a2dd00] hover:bg-[#a2dd00]/20 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>

      {/* Reference images */}
      {hasRefs && (
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-1.5">
            <ScanFace className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
              Referências usadas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.inputImages!.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightbox(img)}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-[#f3f0ed]/10 hover:ring-[#a2dd00]/50 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Referência ${img.order + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Expand className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-[#f3f0ed]/10 p-1.5 text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={`Referência ${lightbox.order + 1}`}
            className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Output thumbnail ─────────────────────────────────────────────────────────

function OutputThumb({
  url,
  index,
  isVideo,
  isActive,
  onClick,
}: {
  url: string;
  index: number;
  isVideo: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 h-20 w-32 overflow-hidden rounded-lg ring-2 transition-all ${isActive
        ? 'ring-[#a2dd00] opacity-100'
        : 'ring-[#f3f0ed]/10 opacity-50 hover:opacity-80 hover:ring-[#f3f0ed]/30'
        }`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[#f3f0ed]/6" />}

      {isVideo ? (
        <video
          key={url}
          src={url}
          muted
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={() => setLoaded(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Versão ${index + 1}`}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Version label */}
      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5">
        {isVideo && <Play className="h-2 w-2 fill-white text-white" />}
        <span className="text-[9px] font-bold text-white">{index + 1}</span>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute inset-0 ring-inset ring-2 ring-[#a2dd00]/40 rounded-lg pointer-events-none" />
      )}
    </button>
  );
}

// ─── Gallery item (memoized) ──────────────────────────────────────────────────

const GalleryItem = memo(function GalleryItem({
  item,
  onClick,
}: {
  item: Generation;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const url = item.outputs?.[0]?.url;
  const isVideo = !!item.durationSeconds;
  const hasRefs = (item.inputImages?.length ?? 0) > 0;
  const outputCount = item.outputs?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-[#f3f0ed]/3 ring-1 ring-[#f3f0ed]/6 hover:ring-[#a2dd00]/40 transition-[box-shadow,ring-color]"
      style={{ contain: 'layout paint' }}
    >
      {/* Static placeholder until media loads */}
      {!loaded && <div className="absolute inset-0 bg-[#f3f0ed]/6" />}

      {isVideo ? (
        <video
          src={url}
          muted
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={() => setLoaded(true)}
        />
      ) : (
        <Image
          src={url!}
          alt={item.prompt ?? 'Imagem gerada'}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          quality={40}
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-medium text-white truncate">{item.prompt ?? '—'}</p>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Expand className="h-3.5 w-3.5 text-white drop-shadow" />
      </div>

      {/* Bottom-right badges */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {isVideo && (
          <div className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5">
            <Play className="h-3 w-3 fill-white text-white" />
            <span className="text-[9px] font-bold text-white">{item.durationSeconds}s</span>
          </div>
        )}
        {outputCount > 1 && (
          <div className="flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <Layers className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[9px] font-bold text-[#a2dd00]">{outputCount}</span>
          </div>
        )}
      </div>

      {/* Top-left badges */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {item.isFavorited && (
          <Heart className="h-3.5 w-3.5 fill-[#a2dd00] text-[#a2dd00] drop-shadow" />
        )}
        {hasRefs && (
          <div className="flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 backdrop-blur-sm">
            <ScanFace className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[8px] font-bold text-[#a2dd00]">{item.inputImages!.length}</span>
          </div>
        )}
      </div>
    </button>
  );
});

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl bg-[#f3f0ed]/6" />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f0ed]/5">
        <ImageIcon className="h-5 w-5 text-[#f3f0ed]/20" />
      </div>
      <p className="text-sm text-[#f3f0ed]/40">Nenhuma imagem gerada ainda.</p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-[#a2dd00]" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="h-6 w-10 animate-pulse rounded-md bg-[#f3f0ed]/8" />
      ) : (
        <span className="text-lg font-bold text-[#f3f0ed]">{value ?? 0}</span>
      )}
    </div>
  );
}
