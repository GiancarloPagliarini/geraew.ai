'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  AudioLines,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  ImageOff,
  SquarePlay,
  type LucideIcon,
} from 'lucide-react';
import { api, type GalleryItem } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/app/EmptyState';

type MediaKind = 'imagem' | 'video' | 'audio';

function kindOf(type: string): MediaKind {
  const t = type.toUpperCase();
  if (t.includes('VIDEO') || t.includes('MOTION')) return 'video';
  if (t.includes('SPEECH') || t.includes('AUDIO') || t.includes('TTS') || t.includes('MUSIC')) return 'audio';
  return 'imagem';
}

const KIND_ICONS: Record<MediaKind, LucideIcon> = {
  imagem: ImageIcon,
  video: SquarePlay,
  audio: AudioLines,
};

function ItemCard({ item }: { item: GalleryItem }) {
  const t = useTranslations('home');
  const locale = useLocale();
  const kind = kindOf(item.type);
  const KindIcon = KIND_ICONS[kind];
  const thumb = item.thumbnailUrl || (kind === 'imagem' ? item.outputUrl : undefined);
  const title = item.prompt?.trim() || t('continue.untitled');

  const [imgError, setImgError] = useState(false);
  const showImage = !!thumb && !imgError;
  // ícone de fallback quando não há mídia ou a imagem falhou ao carregar
  const FallbackIcon = kind === 'audio' ? AudioLines : ImageOff;

  return (
    <Link
      href="/workspace"
      draggable={false}
      className="group w-[232px] shrink-0 select-none sm:w-[252px]"
    >
      <div className="relative h-[152px] overflow-hidden rounded-xl border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] transition-colors duration-200 ease-app group-hover:border-app-hairline-2">
        {/* brilho lime sutil no canto (fallback sem mídia) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            draggable={false}
            onError={() => setImgError(true)}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-app group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          /* preview de erro: thumb indisponível ou falhou ao carregar */
          <FallbackIcon
            className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-app-muted"
            strokeWidth={1.7}
          />
        )}
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/55 py-[5px] pl-2 pr-2.5 backdrop-blur-md">
          <KindIcon className="size-3 text-app-lime" strokeWidth={2} />
          <span className="text-[10.5px] font-semibold tracking-[0.02em] text-white">
            {t(`continue.kind.${kind}`)}
          </span>
        </span>
      </div>
      <p className="mt-2.5 truncate text-[14px] font-semibold text-app-text">{title}</p>
      {item.createdAt && (
        <p className="mt-0.5 font-mono text-[12px] text-app-muted">
          {formatRelativeTime(item.createdAt, locale)}
        </p>
      )}
    </Link>
  );
}

/** Trilho horizontal com drag-to-scroll (mouse) — trackpad/touch seguem nativos. */
function Carousel({ children }: { children: React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });

  return (
    <div
      ref={trackRef}
      className="-mx-1 flex cursor-grab gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag.current = {
          down: true,
          moved: false,
          startX: e.clientX,
          startScroll: trackRef.current?.scrollLeft ?? 0,
        };
      }}
      onPointerMove={(e) => {
        if (!drag.current.down || !trackRef.current) return;
        const dx = e.clientX - drag.current.startX;
        if (Math.abs(dx) > 5 && !drag.current.moved) {
          drag.current.moved = true;
          trackRef.current.setPointerCapture(e.pointerId);
        }
        if (drag.current.moved) trackRef.current.scrollLeft = drag.current.startScroll - dx;
      }}
      onPointerUp={() => {
        drag.current.down = false;
      }}
      onPointerCancel={() => {
        drag.current.down = false;
        drag.current.moved = false;
      }}
      onClickCapture={(e) => {
        // após arrastar, o "soltar" não deve navegar para o card
        if (drag.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          drag.current.moved = false;
        }
      }}
    >
      {children}
    </div>
  );
}

export function ContinueSection() {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['home', 'recent-generations'],
    queryFn: () => api.gallery.list(accessToken!, 1, 12),
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  const items = data?.data ?? [];

  return (
    <section>
      <div className="mb-4 flex items-center gap-1.5">
        <h2 className="text-[16px] font-semibold text-app-text">{t('continue.title')}</h2>
        <ChevronRight className="size-4 text-app-muted" strokeWidth={1.8} />
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="w-[232px] shrink-0 sm:w-[252px]">
              <div className="h-[152px] skeleton-app rounded-xl bg-app-surface" />
              <div className="mt-2.5 h-4 w-3/4 skeleton-app rounded bg-app-surface" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('continue.emptyTitle')}
          cta={{ label: t('continue.emptyCta'), href: '/workspace' }}
          className="py-10"
        />
      ) : (
        <Carousel>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </Carousel>
      )}
    </section>
  );
}
