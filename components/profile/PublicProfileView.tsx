'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ImageOff, Images, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type CommunityFeedPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { CommunityLightbox } from '@/components/community/CommunityLightbox';

const PAGE_SIZE = 30;

type FeedPages = {
  pages: { data: CommunityFeedPost[]; meta: { page: number; limit: number; total: number } }[];
  pageParams: unknown[];
};

function PostCard({ post, onOpen }: { post: CommunityFeedPost; onOpen: () => void }) {
  const [mediaError, setMediaError] = useState(false);
  const isVideo = post.kind === 'video';
  const thumb = isVideo ? post.thumbnailUrl : post.mediaUrl;
  const showImage = !!thumb && !mediaError;

  return (
    <article className="group mb-5 break-inside-avoid">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'relative block w-full overflow-hidden rounded-[14px] border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] text-left transition-colors duration-200 ease-app hover:border-app-hairline-2',
          !showImage && 'h-[200px]',
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb!}
            alt={post.prompt}
            loading="lazy"
            onError={() => setMediaError(true)}
            className="relative block w-full transition-transform duration-300 ease-app group-hover:scale-[1.03]"
          />
        ) : isVideo && !mediaError ? (
          <video
            src={post.mediaUrl}
            muted
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            className="relative block w-full transition-transform duration-300 ease-app group-hover:scale-[1.03]"
          />
        ) : (
          <ImageOff className="absolute left-1/2 top-1/2 size-7 -translate-x-1/2 -translate-y-1/2 text-app-muted" strokeWidth={1.6} />
        )}
      </button>
    </article>
  );
}

export function PublicProfileView({ userId }: { userId: string }) {
  const t = useTranslations('home');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const lightboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const postsKey = ['community', 'user-posts', userId];

  const { data: profile, isPending: profilePending } = useQuery({
    queryKey: ['community', 'user', userId],
    queryFn: () => api.community.userProfile(accessToken!, userId),
    enabled: !!accessToken,
  });

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: postsKey,
    queryFn: ({ pageParam }) => api.community.userPosts(accessToken!, userId, pageParam as number, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total ? last.meta.page + 1 : undefined,
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const posts = useMemo(() => (data?.pages ?? []).flatMap((p) => p.data), [data]);

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

  useEffect(() => {
    return () => {
      if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    };
  }, []);

  // like otimista nos posts deste usuário
  const likeMutation = useMutation({
    mutationFn: ({ post }: { post: CommunityFeedPost }) =>
      post.likedByMe ? api.community.unlike(accessToken!, post.id) : api.community.like(accessToken!, post.id),
    onMutate: async ({ post }) => {
      await queryClient.cancelQueries({ queryKey: postsKey });
      const previous = queryClient.getQueryData<FeedPages>(postsKey);
      queryClient.setQueryData<FeedPages>(postsKey, (old) =>
        !old
          ? old
          : {
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
            },
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(postsKey, ctx.previous);
    },
  });

  // follow otimista (perfil + posts)
  const followMutation = useMutation({
    mutationFn: () =>
      profile?.isFollowing
        ? api.community.unfollow(accessToken!, userId)
        : api.community.follow(accessToken!, userId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['community', 'user', userId] });
      const prev = queryClient.getQueryData(['community', 'user', userId]);
      queryClient.setQueryData(['community', 'user', userId], (old: typeof profile) =>
        old
          ? {
              ...old,
              isFollowing: !old.isFollowing,
              followers: Math.max(0, old.followers + (old.isFollowing ? -1 : 1)),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['community', 'user', userId], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: postsKey }),
  });

  const selectedIndex = posts.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? posts[selectedIndex] : null;

  const openLightbox = (id: string) => {
    if (lightboxTimer.current) clearTimeout(lightboxTimer.current);
    setLightboxClosing(false);
    setSelectedId(id);
  };
  const closeLightbox = () => {
    setLightboxClosing(true);
    lightboxTimer.current = setTimeout(() => {
      setSelectedId(null);
      setLightboxClosing(false);
    }, 180);
  };
  const step = (delta: number) => {
    if (posts.length === 0 || selectedIndex < 0) return;
    const next = (selectedIndex + delta + posts.length) % posts.length;
    setSelectedId(posts[next].id);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1500px] px-6 pb-16 pt-7">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 flex items-center gap-2 text-[13.5px] font-semibold text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
        >
          <ArrowLeft className="size-4" strokeWidth={1.8} />
          {t('community.back')}
        </button>

        {/* cabeçalho */}
        <div className="relative overflow-hidden rounded-[18px] border border-app-hairline bg-app-surface p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[radial-gradient(circle,rgba(162,221,0,0.12),transparent_65%)]" />
          {profilePending || !profile ? (
            <div className="flex items-center gap-5">
              <div className="size-[88px] shrink-0 skeleton-app rounded-full bg-app-card" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 skeleton-app rounded bg-app-card" />
                <div className="h-4 w-56 skeleton-app rounded bg-app-card" />
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-hairline-2 bg-app-card text-[30px] font-bold text-app-lime">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[24px] font-bold tracking-[-0.3px] text-app-text">{profile.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5">
                  <span className="text-[13.5px] text-app-muted">
                    <span className="font-bold text-app-text">{profile.postsCount}</span> {t('profile.stats.posts')}
                  </span>
                  <span className="text-[13.5px] text-app-muted">
                    <span className="font-bold text-app-text">{profile.followers}</span> {t('profile.stats.followers')}
                  </span>
                  <span className="text-[13.5px] text-app-muted">
                    <span className="font-bold text-app-text">{profile.following}</span> {t('profile.stats.following')}
                  </span>
                </div>
              </div>
              {!profile.isMe && (
                <button
                  type="button"
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  className={cn(
                    'h-10 shrink-0 rounded-[10px] px-5 text-[13.5px] font-semibold transition-colors duration-200 ease-app disabled:opacity-60',
                    profile.isFollowing
                      ? 'border border-app-hairline-2 text-app-text-2 hover:text-app-text'
                      : 'bg-app-lime text-app-lime-ink hover:bg-app-lime-hover',
                  )}
                >
                  {profile.isFollowing ? t('community.following') : t('community.follow')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* publicações */}
        <div className="mt-6">
          {isPending ? (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
              {[220, 280, 180, 260, 200, 300, 240, 190].map((h, i) => (
                <div key={i} className="mb-5 break-inside-avoid">
                  <div className="skeleton-app w-full rounded-[14px] bg-app-surface" style={{ height: h }} />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState icon={Images} title={t('profile.publicEmpty')} />
          ) : (
            <>
              <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onOpen={() => openLightbox(post.id)} />
                ))}
              </div>
              <div ref={sentinelRef} className="flex justify-center py-6">
                {isFetchingNextPage && <Loader2 className="size-5 animate-spin text-app-muted" strokeWidth={1.8} />}
              </div>
            </>
          )}
        </div>
      </div>

      {selected && (
        <CommunityLightbox
          post={selected}
          closing={lightboxClosing}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToggleLike={() => likeMutation.mutate({ post: selected })}
        />
      )}
    </div>
  );
}
