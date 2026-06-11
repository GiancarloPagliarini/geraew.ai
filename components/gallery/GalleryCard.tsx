'use client';

import { useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AudioLines, ImageOff } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { GalleryItem } from '@/lib/api';
import { CopyPromptButton } from '@/components/app/CopyPromptButton';
import { KIND_ICONS, kindOf } from '@/components/gallery/kind';

interface GalleryCardProps {
  item: GalleryItem;
  onOpen: (item: GalleryItem, ratio?: number) => void;
}

export function GalleryCard({ item, onOpen }: GalleryCardProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const kind = kindOf(item.type);
  const KindIcon = KIND_ICONS[kind];
  const image = item.thumbnailUrl || (kind === 'image' ? item.outputUrl : undefined);
  const title = item.prompt?.trim() || t('gallery.untitled');
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgError, setImgError] = useState(false);
  const showImage = !!image && !imgError;

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
    <article className="group mb-5 break-inside-avoid">
      <button type="button" onClick={open} className="block w-full text-left">
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
              className="block w-full transition-transform duration-300 ease-app group-hover:scale-[1.04]"
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
