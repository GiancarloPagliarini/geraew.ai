'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageOff, Loader2 } from 'lucide-react';
import { api, type CommunityFeedPost } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { CommunityLightbox } from '@/components/community/CommunityLightbox';

/** Página de uma publicação (link compartilhado) — reusa o lightbox sem navegação. */
export function SinglePostView({ postId }: { postId: string }) {
  const t = useTranslations('home');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const key = ['community', 'post', postId];

  const { data: post, isPending, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.community.post(accessToken!, postId),
    enabled: !!accessToken,
    retry: 1,
  });

  const likeMutation = useMutation({
    mutationFn: () =>
      post!.likedByMe ? api.community.unlike(accessToken!, postId) : api.community.like(accessToken!, postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<CommunityFeedPost>(key);
      queryClient.setQueryData<CommunityFeedPost>(key, (old) =>
        old
          ? {
              ...old,
              likedByMe: !old.likedByMe,
              likesCount: Math.max(0, old.likesCount + (old.likedByMe ? -1 : 1)),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
  });

  const followMutation = useMutation({
    mutationFn: () =>
      post!.author.isFollowing
        ? api.community.unfollow(accessToken!, post!.author.id)
        : api.community.follow(accessToken!, post!.author.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<CommunityFeedPost>(key);
      queryClient.setQueryData<CommunityFeedPost>(key, (old) =>
        old ? { ...old, author: { ...old.author, isFollowing: !old.author.isFollowing } } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-app-lime" strokeWidth={1.8} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <EmptyState
          icon={ImageOff}
          title={t('community.postNotFound')}
          cta={{ label: t('nav.comunidade'), href: '/community' }}
        />
      </div>
    );
  }

  return (
    <CommunityLightbox
      post={post}
      closing={false}
      onClose={() => router.push('/community')}
      onToggleLike={() => likeMutation.mutate()}
      onToggleFollow={() => followMutation.mutate()}
    />
  );
}
