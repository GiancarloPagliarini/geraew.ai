'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  RefreshCw,
  Share2,
  SquarePlay,
  X,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { CommunityFeedPost } from '@/lib/api';

interface CommunityLightboxProps {
  post: CommunityFeedPost;
  closing: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleLike: () => void;
}

/** Lightbox da comunidade: mídia centralizada + painel fixo à direita (design 6.12). */
export function CommunityLightbox({
  post,
  closing,
  onClose,
  onPrev,
  onNext,
  onToggleLike,
}: CommunityLightboxProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const goWithPrompt = (path: '/image' | '/video') => {
    onClose();
    router.push(`${path}?${new URLSearchParams({ prompt: post.prompt }).toString()}`);
  };

  const settings = Array.isArray(post.settings) ? post.settings : [];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.86)] backdrop-blur-[8px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={onClose}
    >
      {/* mídia centralizada na área livre (painel reserva 372px à direita) */}
      <div
        className="flex h-full items-center justify-center p-6 lg:pr-[372px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'relative max-h-[88vh] w-fit max-w-full overflow-hidden rounded-[14px] border border-app-hairline-2 bg-black',
            closing ? 'animate-dialog-out' : 'animate-dialog-in',
          )}
        >
          {post.kind === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              autoPlay
              playsInline
              className="block h-auto max-h-[88vh] w-auto max-w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt={post.prompt}
              className="block h-auto max-h-[88vh] w-auto max-w-full"
            />
          )}
        </div>

        {/* navegação ‹ › */}
        <button
          type="button"
          aria-label={t('community.prev')}
          onClick={onPrev}
          className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
        >
          <ChevronLeft className="size-5" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={t('community.next')}
          onClick={onNext}
          className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text lg:right-[388px]"
        >
          <ChevronRight className="size-5" strokeWidth={1.8} />
        </button>
      </div>

      {/* fechar */}
      <button
        type="button"
        aria-label={t('palette.close')}
        onClick={onClose}
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text lg:right-[388px]"
      >
        <X className="size-5" strokeWidth={1.8} />
      </button>

      {/* painel lateral */}
      <aside
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute inset-x-0 bottom-0 max-h-[60vh] overflow-y-auto rounded-t-[16px] border border-app-hairline-2 bg-app-card p-5 scrollbar-app lg:inset-y-4 lg:left-auto lg:right-4 lg:max-h-none lg:w-[340px] lg:rounded-[16px]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        <div className="flex h-full flex-col gap-5">
          {/* autor + seguir */}
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-hairline-2 bg-app-surface text-[13px] font-bold text-app-lime">
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author.avatarUrl} alt={post.author.name} className="size-full object-cover" />
              ) : (
                post.author.name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold text-app-text">
                {post.author.name}
              </span>
              <span className="block font-mono text-[11px] text-app-muted">
                {formatRelativeTime(post.createdAt, locale)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => toast.info(t('soon'))}
              className="shrink-0 rounded-full bg-app-text px-4 py-1.5 text-[13px] font-semibold text-app-lime-ink transition-opacity duration-200 ease-app hover:opacity-90"
            >
              {t('community.follow')}
            </button>
          </div>

          {/* curtidas + compartilhar */}
          <div className="flex items-center gap-4 text-[13.5px] text-app-text-2">
            <button
              type="button"
              aria-pressed={post.likedByMe}
              onClick={onToggleLike}
              className={cn(
                'flex items-center gap-1.5 transition-colors duration-200 ease-app',
                post.likedByMe ? 'text-app-lime' : 'hover:text-app-text',
              )}
            >
              <Heart
                className="size-4"
                strokeWidth={1.8}
                fill={post.likedByMe ? 'currentColor' : 'none'}
              />
              <span className={cn('font-semibold', post.likedByMe ? 'text-app-lime' : 'text-app-text')}>
                {post.likesCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => toast.info(t('soon'))}
              className="flex items-center gap-1.5 transition-colors duration-200 ease-app hover:text-app-text"
            >
              <Share2 className="size-4" strokeWidth={1.8} />
              {t('community.share')}
            </button>
          </div>

          {/* prompt */}
          {post.prompt && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                {t('community.promptLabel')}
              </span>
              <p className="text-[14.5px] font-semibold leading-relaxed text-app-text">{post.prompt}</p>
            </div>
          )}

          {/* configurações */}
          {settings.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                {t('community.settingsLabel')}
              </span>
              <div className="flex flex-wrap gap-2">
                {settings.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-app-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-app-text-2"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ações */}
          <div className="mt-auto flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => goWithPrompt('/image')}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-app-hairline-2 bg-app-surface text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
            >
              <RefreshCw className="size-4" strokeWidth={1.8} />
              {t('community.recreate')}
            </button>
            <button
              type="button"
              onClick={() => goWithPrompt('/video')}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-app-hairline-2 bg-app-surface text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
            >
              <SquarePlay className="size-4" strokeWidth={1.8} />
              {t('community.createVideo')}
            </button>
            <button
              type="button"
              onClick={() => toast.info(t('soon'))}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-app-hairline-2 bg-app-surface text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
            >
              <ImageIcon className="size-4" strokeWidth={1.8} />
              {t('community.useAsReference')}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
