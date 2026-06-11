'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FolderOpen } from 'lucide-react';
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

function ItemCard({ item }: { item: GalleryItem }) {
  const t = useTranslations('home');
  const locale = useLocale();
  const kind = kindOf(item.type);
  const thumb = item.thumbnailUrl || (kind === 'imagem' ? item.outputUrl : undefined);
  const title = item.prompt?.trim() || t('continue.untitled');

  return (
    <Link
      href="/workspace"
      className="group w-[232px] shrink-0 transition-transform duration-200 ease-app hover:-translate-y-0.5 sm:w-[252px]"
    >
      <div className="relative h-[152px] overflow-hidden rounded-xl border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] transition-colors duration-200 ease-app group-hover:border-app-hairline-2">
        {/* brilho lime sutil no canto (fallback sem mídia) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        )}
        <span className="absolute bottom-2.5 left-3 font-mono text-[11px] text-app-text-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
          {t(`continue.kind.${kind}`)}
        </span>
      </div>
      <p className="mt-2.5 truncate text-[14px] font-semibold text-app-text">
        {t(`continue.kind.${kind}`)} — {title}
      </p>
      {item.createdAt && (
        <p className="mt-0.5 font-mono text-[12px] text-app-muted">
          {formatRelativeTime(item.createdAt, locale)}
        </p>
      )}
    </Link>
  );
}

export function ContinueSection() {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['home', 'recent-generations'],
    queryFn: () => api.gallery.list(accessToken!, 1, 8),
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
              <div className="h-[152px] animate-pulse rounded-xl bg-app-surface" />
              <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded bg-app-surface" />
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
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
