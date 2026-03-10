'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Download,
  Expand,
  Heart,
  ImageIcon,
  Loader2,
  Play,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { api, Generation } from '@/lib/api';

interface GalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GalleryDialog({ open, onOpenChange }: GalleryDialogProps) {
  const { accessToken } = useAuth();
  const [selected, setSelected] = useState<Generation | null>(null);

  const { data: galleryData, isLoading: galleryLoading } = useQuery({
    queryKey: ['gallery', 'list'],
    queryFn: () => api.gallery.list(accessToken!),
    enabled: !!accessToken && open,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gallery', 'stats'],
    queryFn: () => api.gallery.stats(accessToken!),
    enabled: !!accessToken && open,
  });

  const items = galleryData?.data ?? [];
  const total = galleryData?.meta.total ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#f3f0ed]/8 bg-[#1a2123] text-[#f3f0ed] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col **:data-[slot=dialog-close]:text-[#f3f0ed]/50 **:data-[slot=dialog-close]:hover:text-[#f3f0ed]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f3f0ed]">
            <ImageIcon className="h-4 w-4 text-[#a2dd00]" />
            Galeria
          </DialogTitle>
          <DialogDescription className="text-[#f3f0ed]/40">
            Suas imagens geradas com IA
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        {!selected && (
          <div className="grid grid-cols-4 gap-2 shrink-0">
            <StatCard
              icon={Sparkles}
              label="Gerações"
              value={statsLoading ? '—' : String(stats?.totalGenerations ?? 0)}
            />
            <StatCard
              icon={Zap}
              label="Créditos usados"
              value={statsLoading ? '—' : String(stats?.totalCreditsUsed ?? 0)}
            />
            <StatCard
              icon={Heart}
              label="Favoritos"
              value={statsLoading ? '—' : String(stats?.favoriteCount ?? 0)}
            />
            <StatCard
              icon={Star}
              label="Imagens"
              value={statsLoading ? '—' : String(stats?.generationsByType?.TEXT_TO_IMAGE ?? 0)}
            />
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto sidebar-scroll flex-1 -mx-1 px-1">
          {selected ? (
            /* ── Detail view ── */
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelected(null)}
                className="self-start flex items-center gap-1 text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar para galeria
              </button>

              {selected.durationSeconds ? (
                <video
                  src={selected.outputUrl}
                  controls
                  className="w-full rounded-xl bg-black max-h-[50vh]"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.outputUrl}
                  alt={selected.prompt ?? 'Imagem gerada'}
                  className="w-full rounded-xl object-contain bg-[#f3f0ed]/3 max-h-[50vh]"
                />
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  {selected.prompt && (
                    <p className="text-sm text-[#f3f0ed]/70 line-clamp-3">{selected.prompt}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-[#f3f0ed]/30 font-medium tracking-wider">
                    {selected.resolution && <span>{selected.resolution}</span>}
                    {selected.durationSeconds && <span>{selected.durationSeconds}s</span>}
                    {selected.creditsConsumed > 0 && (
                      <span>{selected.creditsConsumed} créditos</span>
                    )}
                    {selected.createdAt && (
                      <span>{new Date(selected.createdAt).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <a
                  href={selected.outputUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#a2dd00]/10 px-3 py-1.5 text-xs font-medium text-[#a2dd00] hover:bg-[#a2dd00]/20 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            </div>
          ) : galleryLoading ? (
            /* ── Loading ── */
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
            </div>
          ) : items.length === 0 ? (
            /* ── Empty ── */
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f0ed]/5">
                <ImageIcon className="h-5 w-5 text-[#f3f0ed]/20" />
              </div>
              <p className="text-sm text-[#f3f0ed]/40">Nenhuma imagem gerada ainda.</p>
            </div>
          ) : (
            /* ── Grid ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-[#f3f0ed]/3 ring-1 ring-[#f3f0ed]/6 hover:ring-[#a2dd00]/40 transition-all"
                >
                  {item.durationSeconds ? (
                    /* Video thumbnail */
                    <video
                      src={item.outputUrl}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl ?? item.outputUrl}
                      alt={item.prompt ?? 'Imagem gerada'}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-medium text-white truncate">
                      {item.prompt ?? '—'}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Expand className="h-3.5 w-3.5 text-white drop-shadow" />
                  </div>
                  {/* Video badge */}
                  {item.durationSeconds && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
                      <Play className="h-2.5 w-2.5 fill-white text-white" />
                      <span className="text-[9px] font-bold text-white">{item.durationSeconds}s</span>
                    </div>
                  )}
                  {item.isFavorited && (
                    <div className="absolute top-2 left-2">
                      <Heart className="h-3.5 w-3.5 fill-[#a2dd00] text-[#a2dd00] drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!selected && !galleryLoading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3 -mx-6 px-6">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {total} {total === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-[#a2dd00]" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
          {label}
        </span>
      </div>
      <span className="text-lg font-bold text-[#f3f0ed]">{value}</span>
    </div>
  );
}
