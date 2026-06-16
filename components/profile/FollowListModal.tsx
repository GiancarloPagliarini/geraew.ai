'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Users as UsersIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type CommunityUser } from '@/lib/api';

type Mode = 'followers' | 'following';

function UserRow({
  user,
  accessToken,
  onChanged,
  onNavigate,
}: {
  user: CommunityUser;
  accessToken: string;
  onChanged: () => void;
  onNavigate: (id: string) => void;
}) {
  const t = useTranslations('home');
  const [following, setFollowing] = useState(user.isFollowing);

  const mutation = useMutation({
    mutationFn: () =>
      following ? api.community.unfollow(accessToken, user.id) : api.community.follow(accessToken, user.id),
    onMutate: () => setFollowing((v) => !v),
    onError: () => setFollowing(user.isFollowing),
    onSuccess: onChanged,
  });

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <button
        type="button"
        onClick={() => onNavigate(user.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-app-hairline-2 bg-app-surface text-[14px] font-bold text-app-lime">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-app-text transition-colors duration-200 ease-app hover:text-app-lime">
          {user.name}
        </span>
      </button>
      {!user.isMe && (
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors duration-200 ease-app disabled:opacity-60',
            following
              ? 'border border-app-hairline-2 text-app-text-2 hover:text-app-text'
              : 'bg-app-text text-app-lime-ink hover:opacity-90',
          )}
        >
          {following ? t('community.following') : t('community.follow')}
        </button>
      )}
    </div>
  );
}

/** Modal com a lista de seguidores ou de quem o usuário segue. */
export function FollowListModal({
  mode,
  accessToken,
  onClose,
}: {
  mode: Mode;
  accessToken: string;
  onClose: () => void;
}) {
  const t = useTranslations('home');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => {
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  };

  const navigateToUser = (id: string) => {
    onClose();
    router.push(`/u/${id}`);
  };
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const { data, isPending } = useQuery({
    queryKey: ['community', mode],
    queryFn: () =>
      mode === 'followers' ? api.community.followers(accessToken) : api.community.followingList(accessToken),
    enabled: !!accessToken,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['community', 'follow-stats'] });
  };

  const users = data ?? [];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.7)] backdrop-blur-[6px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(`profile.stats.${mode}`)}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto mt-[10vh] flex max-h-[70vh] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        <div className="flex items-center justify-between border-b border-app-hairline px-5 py-4">
          <h2 className="text-[16px] font-bold text-app-text">{t(`profile.stats.${mode}`)}</h2>
          <button
            type="button"
            aria-label={t('palette.close')}
            onClick={close}
            className="flex size-8 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-app">
          {isPending ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-app-muted" strokeWidth={1.8} />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <UsersIcon className="size-7 text-app-muted" strokeWidth={1.6} />
              <p className="text-[13.5px] text-app-muted">
                {t(`profile.${mode === 'followers' ? 'followersEmpty' : 'followingEmpty'}`)}
              </p>
            </div>
          ) : (
            users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                accessToken={accessToken}
                onChanged={refresh}
                onNavigate={navigateToUser}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
