'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, ImageOff, Loader2, Plus, Rss, Search, SquarePlay, X } from 'lucide-react';
import { cn, normalizeSearch } from '@/lib/utils';
import { api, type CommunityFeedPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { CommunityLightbox } from '@/components/community/CommunityLightbox';
import { SubmitPostModal } from '@/components/community/SubmitPostModal';

const PAGE_SIZE = 30;

type FeedPages = {
  pages: { data: CommunityFeedPost[]; meta: { page: number; limit: number; total: number } }[];
  pageParams: unknown[];
};

function PostCard({
  post,
  onOpen,
  onToggleLike,
}: {
  post: CommunityFeedPost;
  onOpen: (post: CommunityFeedPost) => void;
  onToggleLike: (post: CommunityFeedPost) => void;
}) {
  const t = useTranslations('home');
  const [imgError, setImgError] = useState(false);
  // imagem usa a mídia real (proporção original); thumb fica só para vídeo
  const thumb = post.kind === 'image' ? post.mediaUrl : post.thumbnailUrl;
  const showImage = !!thumb && !imgError;
  const showVideo = !showImage && post.kind === 'video' && !imgError;
  const showFallback = !showImage && !showVideo;

  return (
    <article className="group mb-5 break-inside-avoid">
      <button type="button" onClick={() => onOpen(post)} className="block w-full text-left">
        <div
          className={cn(
            'relative w-full overflow-hidden rounded-[14px] border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] transition-colors duration-200 ease-app group-hover:border-app-hairline-2',
            showFallback && 'h-[240px]',
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
          {showImage ? (
            // a mídia define a altura do card (masonry estilo Pinterest)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={post.prompt}
              loading="lazy"
              onError={() => setImgError(true)}
              className="relative block w-full transition-transform duration-300 ease-app group-hover:scale-[1.04]"
            />
          ) : showVideo ? (
            <video
              src={post.mediaUrl}
              muted
              playsInline
              preload="metadata"
              onError={() => setImgError(true)}
              className="relative block w-full"
            />
          ) : (
            <ImageOff
              className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-app-muted"
              strokeWidth={1.6}
            />
          )}
          {post.kind === 'video' && (
            <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-[rgba(13,16,17,0.65)] px-2.5 py-1 text-[11px] font-bold text-app-text backdrop-blur-md">
              <SquarePlay className="size-3 text-app-lime" strokeWidth={2} />
              {t('gallery.kind.video')}
            </span>
          )}
        </div>
      </button>
      {/* autor + curtidas */}
      <div className="mt-2.5 flex items-center gap-2">
        <span className="flex size-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-hairline-2 bg-app-surface text-[10px] font-bold text-app-lime">
          {post.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.author.avatarUrl} alt={post.author.name} className="size-full object-cover" />
          ) : (
            post.author.name.charAt(0).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-app-text">
          {post.author.name}
        </span>
        <button
          type="button"
          aria-pressed={post.likedByMe}
          onClick={() => onToggleLike(post)}
          className={cn(
            'flex shrink-0 items-center gap-1 font-mono text-[12px] transition-colors duration-200 ease-app',
            post.likedByMe ? 'text-app-lime' : 'text-app-muted hover:text-app-text',
          )}
        >
          <Heart
            className="size-3.5"
            strokeWidth={1.8}
            fill={post.likedByMe ? 'currentColor' : 'none'}
          />
          {post.likesCount}
        </button>
      </div>
    </article>
  );
}

export function CommunityView() {
  const t = useTranslations('home');
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const lightboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['community', 'feed'],
    queryFn: ({ pageParam }) => api.community.feed(accessToken!, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total ? last.meta.page + 1 : undefined,
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  const allPosts = useMemo(() => (data?.pages ?? []).flatMap((p) => p.data), [data]);

  const posts = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return allPosts;
    return allPosts.filter((p) => normalizeSearch(`${p.author.name} ${p.prompt}`).includes(q));
  }, [allPosts, query]);

  // scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // like otimista no cache do feed
  const likeMutation = useMutation({
    mutationFn: ({ post }: { post: CommunityFeedPost }) =>
      post.likedByMe
        ? api.community.unlike(accessToken!, post.id)
        : api.community.like(accessToken!, post.id),
    onMutate: async ({ post }) => {
      await queryClient.cancelQueries({ queryKey: ['community', 'feed'] });
      const previous = queryClient.getQueryData<FeedPages>(['community', 'feed']);
      queryClient.setQueryData<FeedPages>(['community', 'feed'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.map((p) =>
              p.id === post.id
                ? {
                    ...p,
                    likedByMe: !post.likedByMe,
                    likesCount: Math.max(0, p.likesCount + (post.likedByMe ? -1 : 1)),
                  }
                : p,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['community', 'feed'], context.previous);
    },
  });

  const toggleLike = (post: CommunityFeedPost) => likeMutation.mutate({ post });

  const selectedIndex = posts.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? posts[selectedIndex] : null;

  const openLightbox = (post: CommunityFeedPost) => {
    if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    setLightboxClosing(false);
    setSelectedId(post.id);
  };

  const closeLightbox = () => {
    setLightboxClosing(true);
    lightboxTimer.current = setTimeout(() => {
      setSelectedId(null);
      setLightboxClosing(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    };
  }, []);

  const step = (delta: number) => {
    if (posts.length === 0 || selectedIndex < 0) return;
    const next = (selectedIndex + delta + posts.length) % posts.length;
    setSelectedId(posts[next].id);
  };

  return (
    // toda a área é o container de scroll; cabeçalho fica sticky no topo
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 lg:px-11">
        <div className="sticky top-0 z-10 flex items-center gap-3 bg-app-bg pb-4 pt-6">
          <p className="min-w-0 flex-1 truncate text-[15px] text-app-text-2">
            {t('community.subtitle')}
          </p>

          {/* busca expansível */}
          {searchOpen ? (
            <div className="flex h-10 w-full max-w-[280px] items-center gap-2 rounded-full border border-app-hairline bg-app-surface px-3.5 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
              <Search className="size-4 shrink-0 text-app-muted" strokeWidth={1.8} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('community.searchPlaceholder')}
                className="w-full bg-transparent text-[13.5px] text-app-text outline-none placeholder:text-app-muted"
              />
              <button
                type="button"
                aria-label={t('palette.close')}
                onClick={() => {
                  setSearchOpen(false);
                  setQuery('');
                }}
                className="text-app-muted transition-colors duration-200 ease-app hover:text-app-text"
              >
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={t('community.searchPlaceholder')}
              onClick={() => setSearchOpen(true)}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <Search className="size-[18px]" strokeWidth={1.8} />
            </button>
          )}

          {/* publicar */}
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="flex h-10 shrink-0 items-center gap-2 rounded-[10px] bg-app-lime px-4 text-[13.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover"
          >
            <Plus className="size-4" strokeWidth={2.2} />
            {t('community.post')}
          </button>
        </div>

        {isPending ? (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {[300, 200, 340, 240, 180, 300, 260, 220, 320, 210, 280, 190, 350, 230, 170, 290].map((h, i) => (
              <div key={i} className="mb-5 break-inside-avoid">
                <div
                  className="skeleton-app w-full rounded-[14px] bg-app-surface"
                  style={{ height: h, animationDelay: `${(i * 110) % 660}ms` }}
                />
                <div className="mt-2.5 h-4 w-2/3 skeleton-app rounded bg-app-surface" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Rss}
            title={t('community.empty')}
            hint={t('community.emptyHint')}
            cta={{ label: t('community.post'), onClick: () => setSubmitOpen(true) }}
          />
        ) : (
          <>
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onOpen={openLightbox} onToggleLike={toggleLike} />
              ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-6">
              {isFetchingNextPage && (
                <Loader2 className="size-5 animate-spin text-app-muted" strokeWidth={1.8} />
              )}
            </div>
          </>
        )}
      </div>

      {selected && (
        <CommunityLightbox
          post={selected}
          closing={lightboxClosing}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToggleLike={() => toggleLike(selected)}
        />
      )}

      {submitOpen && <SubmitPostModal onClose={() => setSubmitOpen(false)} />}
    </div>
  );
}
