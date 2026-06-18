'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AudioLines, Download, Heart, ImageOff, X } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { GalleryItem } from '@/lib/api';
import { downloadMedia } from '@/lib/download-media';
import { CopyPromptButton } from '@/components/app/CopyPromptButton';
import { kindOf } from '@/components/gallery/kind';

interface LightboxProps {
  item: GalleryItem;
  /** proporção da mídia (largura/altura) vinda da thumb do grid */
  ratio?: number;
  closing: boolean;
  onClose: () => void;
  /** quando definido, exibe o botão de favoritar nas ações */
  onToggleFavorite?: (item: GalleryItem) => void;
}

export function Lightbox({ item, ratio, closing, onClose, onToggleFavorite }: LightboxProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const kind = kindOf(item.type);
  const src = item.outputUrl || item.thumbnailUrl;
  const title = item.prompt?.trim() || t('gallery.untitled');
  // skeleton até a mídia em alta carregar
  const [loaded, setLoaded] = useState(!src);
  const [mediaError, setMediaError] = useState(false);

  const failMedia = () => {
    setMediaError(true);
    setLoaded(true);
  };

  // dimensiona o skeleton na proporção real da mídia, respeitando os mesmos
  // limites que a mídia terá
  const skeletonStyle = useMemo(() => {
    if (!ratio || typeof window === 'undefined') return undefined;
    const maxH = window.innerHeight * 0.9 - 90;
    const maxW = Math.min(1100, window.innerWidth * 0.92);
    const width = Math.min(maxW, maxH * ratio);
    return { width, height: width / ratio };
  }, [ratio]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,10,11,0.86)] p-6 backdrop-blur-[8px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[90vh] w-fit max-w-[min(1100px,92vw)] flex-col items-center gap-3',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {/* skeleton enquanto a mídia em alta carrega */}
        {!loaded && (
          <>
            <div
              className={cn(
                'skeleton-app rounded-[14px] border border-app-hairline bg-app-surface',
                kind === 'voice'
                  ? 'h-[200px] w-[min(480px,86vw)]'
                  : !skeletonStyle && 'h-[min(70vh,640px)] aspect-[3/4]',
              )}
              style={kind === 'voice' ? undefined : skeletonStyle}
            />
            <div className="flex h-[58px] w-0 min-w-full skeleton-app items-center gap-3 rounded-[14px] border border-app-hairline bg-app-surface px-4">
              <div className="h-3.5 w-2/3 rounded bg-app-card-hover" />
              <div className="ml-auto h-8 w-[120px] rounded-[10px] bg-app-card-hover" />
            </div>
          </>
        )}

        {/* mídia falhou ao carregar */}
        {mediaError && (
          <div className="flex h-[280px] w-[min(480px,86vw)] flex-col items-center justify-center gap-3 rounded-[14px] border border-app-hairline-2 bg-app-card">
            <ImageOff className="size-8 text-app-muted" strokeWidth={1.6} />
            <p className="text-[13.5px] text-app-text-2">{t('gallery.mediaError')}</p>
          </div>
        )}

        {/* mídia */}
        {mediaError ? null : kind === 'voice' ? (
          <div
            className={cn(
              'flex w-[min(480px,86vw)] flex-col items-center gap-5 rounded-[18px] border border-app-hairline-2 bg-app-card px-6 py-8',
              !loaded && 'hidden',
            )}
          >
            <span className="flex size-16 items-center justify-center rounded-full border border-[rgba(162,221,0,0.3)] bg-[rgba(162,221,0,0.08)]">
              <AudioLines className="size-7 text-app-lime" strokeWidth={1.8} />
            </span>
            {src && (
              <audio
                src={src}
                controls
                preload="metadata"
                onLoadedMetadata={() => setLoaded(true)}
                onError={failMedia}
                className="w-full"
              />
            )}
          </div>
        ) : kind === 'image' ? (
          src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={title}
              onLoad={() => setLoaded(true)}
              onError={failMedia}
              className={cn(
                'h-auto w-auto max-w-full rounded-[14px] border border-app-hairline-2',
                !loaded && 'hidden',
              )}
              style={{ maxHeight: 'calc(90vh - 90px)' }}
            />
          )
        ) : (
          src && (
            <video
              src={src}
              controls
              autoPlay
              playsInline
              onLoadedData={() => setLoaded(true)}
              onError={failMedia}
              className={cn(
                'h-auto w-auto max-w-full rounded-[14px] border border-app-hairline-2 bg-black',
                !loaded && 'hidden',
              )}
              style={{ maxHeight: 'calc(90vh - 90px)' }}
            />
          )
        )}

        {/* prompt + ações — w-0 + min-w-full: acompanha a largura da mídia sem alargá-la */}
        <div
          className={cn(
            'flex w-0 min-w-full items-center gap-3 rounded-[14px] border border-app-hairline bg-app-card px-4 py-3',
            !loaded && 'hidden',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] text-app-text" title={item.prompt ?? undefined}>
              {title}
            </p>
            {item.createdAt && (
              <p className="mt-0.5 font-mono text-[11px] text-app-muted">
                {formatRelativeTime(item.createdAt, locale)}
              </p>
            )}
          </div>
          {src && (
            <button
              type="button"
              aria-label={t('gallery.download')}
              title={t('gallery.download')}
              onClick={() => downloadMedia(src, kind)}
              className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-app-hairline bg-app-surface text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
            >
              <Download className="size-4" strokeWidth={2} />
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={item.isFavorited ? t('gallery.unfavorite') : t('gallery.favorite')}
              title={item.isFavorited ? t('gallery.unfavorite') : t('gallery.favorite')}
              onClick={() => onToggleFavorite(item)}
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-app-hairline bg-app-surface transition-colors duration-200 ease-app hover:bg-app-card-hover',
                item.isFavorited ? 'text-app-lime' : 'text-app-text',
              )}
            >
              <Heart className="size-4" strokeWidth={2} fill={item.isFavorited ? 'currentColor' : 'none'} />
            </button>
          )}
          {item.prompt?.trim() && (
            <CopyPromptButton
              prompt={item.prompt}
              withLabel
              className="h-9 rounded-[10px] border border-app-hairline bg-app-surface px-3.5 text-[13px] font-semibold text-app-text hover:bg-app-card-hover"
            />
          )}
        </div>
      </div>

      {/* fechar */}
      <button
        type="button"
        aria-label={t('palette.close')}
        onClick={onClose}
        className="absolute right-5 top-5 flex size-10 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
      >
        <X className="size-5" strokeWidth={1.8} />
      </button>
    </div>
  );
}
