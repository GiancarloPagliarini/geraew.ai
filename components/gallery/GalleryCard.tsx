'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AudioLines, Download, Heart, ImageOff } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { GalleryItem } from '@/lib/api';
import { downloadMedia } from '@/lib/download-media';
import { CopyPromptButton } from '@/components/app/CopyPromptButton';
import { KIND_ICONS, kindOf } from '@/components/gallery/kind';

/** tipo do dataTransfer ao arrastar uma imagem da galeria para as referências */
export const GALLERY_IMAGE_DRAG_TYPE = 'application/x-geraew-image-url';

interface GalleryCardProps {
  item: GalleryItem;
  onOpen: (item: GalleryItem, ratio?: number) => void;
  /** quando definido, exibe o botão de favoritar sobre o card */
  onToggleFavorite?: (item: GalleryItem) => void;
}

export function GalleryCard({ item, onOpen, onToggleFavorite }: GalleryCardProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const kind = kindOf(item.type);
  const KindIcon = KIND_ICONS[kind];
  const image = item.thumbnailUrl || (kind === 'image' ? item.outputUrl : undefined);
  const title = item.prompt?.trim() || t('gallery.untitled');
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgError, setImgError] = useState(false);
  const showImage = !!image && !imgError;
  // imagens podem ser arrastadas direto para as referências dos painéis de geração
  const dragUrl = kind === 'image' ? item.outputUrl || item.thumbnailUrl : undefined;
  const canDrag = !!dragUrl && showImage;
  const downloadUrl = item.outputUrl || item.thumbnailUrl;

  const open = () => {
    // a thumb do grid já carregou — a proporção dela dimensiona o skeleton do lightbox
    const el = imgRef.current;
    const ratio =
      el && el.naturalWidth > 0 && el.naturalHeight > 0
        ? el.naturalWidth / el.naturalHeight
        : undefined;
    onOpen(item, ratio);
  };

  return (
    <article
      className="group relative mb-5 break-inside-avoid"
      draggable={canDrag || undefined}
      onDragStart={
        canDrag
          ? (e) => {
              e.dataTransfer.setData(GALLERY_IMAGE_DRAG_TYPE, dragUrl!);
              e.dataTransfer.setData('text/uri-list', dragUrl!);
              e.dataTransfer.effectAllowed = 'copy';
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={open}
        className={cn('block w-full text-left', canDrag && 'cursor-grab active:cursor-grabbing')}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-[14px] border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] transition-colors duration-200 ease-app group-hover:border-app-hairline-2',
            !showImage && (kind === 'voice' ? 'h-[130px]' : 'h-[240px]'),
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={image}
              alt={title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="relative block w-full transition-transform duration-300 ease-app group-hover:scale-[1.04]"
            />
          ) : kind === 'voice' ? (
            <AudioLines
              className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-app-muted"
              strokeWidth={1.8}
            />
          ) : (
            /* thumb indisponível ou falhou ao carregar */
            <ImageOff
              className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-app-muted"
              strokeWidth={1.6}
            />
          )}
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-[rgba(13,16,17,0.65)] px-2.5 py-1 text-[11px] font-bold text-app-text backdrop-blur-md">
            <KindIcon className="size-3 text-app-lime" strokeWidth={2} />
            {t(`gallery.kind.${kind}`)}
          </span>
        </div>
      </button>
      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5">
        {downloadUrl && (
          <button
            type="button"
            aria-label={t('gallery.download')}
            title={t('gallery.download')}
            onClick={(e) => {
              e.stopPropagation();
              downloadMedia(downloadUrl, kind);
            }}
            className="flex size-8 items-center justify-center rounded-full bg-[rgba(13,16,17,0.65)] text-app-text opacity-0 backdrop-blur-md transition-all duration-200 ease-app hover:bg-[rgba(13,16,17,0.85)] group-hover:opacity-100"
          >
            <Download className="size-4" strokeWidth={2} />
          </button>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={item.isFavorited ? t('gallery.unfavorite') : t('gallery.favorite')}
            title={item.isFavorited ? t('gallery.unfavorite') : t('gallery.favorite')}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            className={cn(
              'flex size-8 items-center justify-center rounded-full bg-[rgba(13,16,17,0.65)] backdrop-blur-md transition-all duration-200 ease-app hover:bg-[rgba(13,16,17,0.85)]',
              item.isFavorited
                ? 'text-app-lime opacity-100'
                : 'text-app-text opacity-0 group-hover:opacity-100',
            )}
          >
            <Heart className="size-4" strokeWidth={2} fill={item.isFavorited ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-app-text">{title}</p>
        {item.prompt?.trim() && <CopyPromptButton prompt={item.prompt} />}
      </div>
      {item.createdAt && (
        <p className="mt-0.5 font-mono text-[12px] text-app-muted">
          {formatRelativeTime(item.createdAt, locale)}
        </p>
      )}
    </article>
  );
}
