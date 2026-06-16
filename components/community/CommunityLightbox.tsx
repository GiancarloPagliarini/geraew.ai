'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Check,
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

/** Prompt com colapso estilo Instagram: clampa em N linhas + "ver mais".
 *  Recebe `key={post.id}` no pai, então remonta limpo a cada post. */
function ExpandablePrompt({ prompt }: { prompt: string }) {
  const t = useTranslations('home');
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // mede no mount (callback ref): texto clampado ultrapassa a área visível?
  const measure = (el: HTMLParagraphElement | null) => {
    if (el) setOverflowing(el.scrollHeight - el.clientHeight > 2);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
        {t('community.promptLabel')}
      </span>
      <p
        ref={measure}
        className={cn(
          'text-[14.5px] font-semibold leading-relaxed text-app-text',
          !expanded && 'line-clamp-6',
        )}
      >
        {prompt}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[13px] font-semibold text-app-lime transition-colors duration-200 ease-app hover:text-app-lime-bright"
        >
          {expanded ? t('community.showLess') : t('community.showMore')}
        </button>
      )}
    </div>
  );
}

interface CommunityLightboxProps {
  post: CommunityFeedPost;
  closing: boolean;
  onClose: () => void;
  /** sem onPrev/onNext (ex.: página de post único) as setas e atalhos somem */
  onPrev?: () => void;
  onNext?: () => void;
  onToggleLike: () => void;
  /** quando ausente, o botão Seguir não é exibido (ex.: posts do próprio usuário) */
  onToggleFollow?: () => void;
}

/** Lightbox da comunidade: mídia centralizada + painel fixo à direita (design 6.12). */
export function CommunityLightbox({
  post,
  closing,
  onClose,
  onPrev,
  onNext,
  onToggleLike,
  onToggleFollow,
}: CommunityLightboxProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const goWithPrompt = (path: '/image' | '/video') => {
    onClose();
    router.push(`${path}?${new URLSearchParams({ prompt: post.prompt }).toString()}`);
  };

  const sharePost = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setCopied(true);
      toast.success(t('community.linkCopied'));
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t('community.shareError'));
    }
  };

  const settings = Array.isArray(post.settings) ? post.settings : [];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.86)] backdrop-blur-[8px] max-lg:flex max-lg:flex-col',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={onClose}
    >
      {/* mídia: no mobile ocupa o espaço acima da folha (coluna única, sem vão);
          no desktop centralizada na área livre (painel reserva 372px à direita) */}
      <div
        className="relative flex h-full items-center justify-center p-6 max-lg:h-auto max-lg:min-h-0 max-lg:flex-1 max-lg:p-4 lg:pr-[372px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'relative max-h-[40vh] w-fit max-w-full overflow-hidden rounded-[14px] border border-app-hairline-2 bg-black lg:max-h-[88vh]',
            closing ? 'animate-dialog-out' : 'animate-dialog-in',
          )}
        >
          {post.kind === 'video' ? (
            <video
              src={post.mediaUrl}
              controls
              autoPlay
              playsInline
              className="block h-auto max-h-[40vh] w-auto max-w-full lg:max-h-[88vh]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt={post.prompt}
              className="block h-auto max-h-[40vh] w-auto max-w-full lg:max-h-[88vh]"
            />
          )}
        </div>

        {/* navegação ‹ › */}
        {onPrev && (
          <button
            type="button"
            aria-label={t('community.prev')}
            onClick={onPrev}
            className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} />
          </button>
        )}
        {onNext && (
          <button
            type="button"
            aria-label={t('community.next')}
            onClick={onNext}
            className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-app-hairline-2 bg-app-card text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text lg:right-[388px]"
          >
            <ChevronRight className="size-5" strokeWidth={1.8} />
          </button>
        )}
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
          'absolute inset-x-0 bottom-0 max-h-[62vh] overflow-y-auto rounded-t-[16px] border border-app-hairline-2 bg-app-card p-5 scrollbar-app max-lg:static max-lg:shrink-0 lg:inset-y-4 lg:left-auto lg:right-4 lg:max-h-none lg:w-[340px] lg:rounded-[16px]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        <div className="flex h-full flex-col gap-5">
          {/* autor + seguir */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push(`/u/${post.author.id}`);
              }}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-hairline-2 bg-app-surface text-[13px] font-bold text-app-lime">
                {post.author.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.author.avatarUrl} alt={post.author.name} className="size-full object-cover" />
                ) : (
                  post.author.name.charAt(0).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-app-text transition-colors duration-200 ease-app hover:text-app-lime">
                  {post.author.name}
                </span>
                <span className="block font-mono text-[11px] text-app-muted">
                  {formatRelativeTime(post.createdAt, locale)}
                </span>
              </span>
            </button>
            {onToggleFollow && !post.author.isMe && (
              <button
                type="button"
                onClick={onToggleFollow}
                aria-pressed={post.author.isFollowing}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-200 ease-app',
                  post.author.isFollowing
                    ? 'border border-app-hairline-2 text-app-text-2 hover:text-app-text'
                    : 'bg-app-text text-app-lime-ink hover:opacity-90',
                )}
              >
                {post.author.isFollowing ? t('community.following') : t('community.follow')}
              </button>
            )}
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
              onClick={sharePost}
              className={cn(
                'flex items-center gap-1.5 transition-colors duration-200 ease-app',
                copied ? 'text-app-lime' : 'hover:text-app-text',
              )}
            >
              {copied ? (
                <Check className="size-4 animate-[share-pop_0.3s_ease]" strokeWidth={2.2} />
              ) : (
                <Share2 className="size-4" strokeWidth={1.8} />
              )}
              {copied ? t('community.linkCopiedShort') : t('community.share')}
            </button>
          </div>

          {/* prompt */}
          {post.prompt && <ExpandablePrompt key={post.id} prompt={post.prompt} />}

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
