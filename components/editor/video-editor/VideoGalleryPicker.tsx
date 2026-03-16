'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, Generation } from '@/lib/api';

export function VideoGalleryPicker({
  accessToken,
  onSelect,
  onClose,
}: {
  accessToken: string | null;
  onSelect: (gen: Generation) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['gallery-picker-videos-editor'],
    queryFn: ({ pageParam }) =>
      api.gallery.list(accessToken!, pageParam as number, 12, {
        type: 'TEXT_TO_VIDEO,IMAGE_TO_VIDEO,REFERENCE_VIDEO',
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];

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

  return (
    <div className="shrink-0 rounded-xl border border-[#f3f0ed]/10 bg-[#151b1d] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#f3f0ed]/7">
        <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/50">
          ESCOLHER VIDEO DA GALERIA
        </span>
        <button
          onClick={onClose}
          className="text-[#f3f0ed]/30 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[220px] overflow-y-auto sidebar-scroll p-2"
        onWheel={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg bg-[#f3f0ed]/6 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[10px] text-[#f3f0ed]/30 py-6">
            Nenhum video na galeria.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((item) => {
                const output = item.outputs?.[0];
                if (!output) return null;
                const thumb = output.thumbnailUrl ?? output.url;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="relative aspect-video rounded-lg overflow-hidden ring-2 ring-transparent transition-all opacity-80 hover:opacity-100 hover:ring-[#a2dd00]/50"
                  >
                    {item.durationSeconds ? (
                      <video
                        src={output.url}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white/80">
                      {item.durationSeconds ?? '?'}s
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div ref={sentinelRef} className="h-2" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]/50" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
