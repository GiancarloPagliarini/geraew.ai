'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Hourglass, XCircle, type LucideIcon } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { api, type AppNotification } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TYPE_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  'community-submitted': { icon: Hourglass, className: 'text-app-text-2' },
  'community-approved': { icon: CheckCircle2, className: 'text-app-lime' },
  'community-rejected': { icon: XCircle, className: 'text-red-400' },
};

function NotificationRow({ notification }: { notification: AppNotification }) {
  const t = useTranslations('home');
  const locale = useLocale();
  const meta = TYPE_ICONS[notification.type] ?? {
    icon: Bell,
    className: 'text-app-text-2',
  };
  const Icon = meta.icon;
  const unread = !notification.readAt;
  const reason = (notification.data?.reason as string | undefined) ?? null;

  // texto pelo tipo; tipos desconhecidos caem no genérico
  const known = notification.type in TYPE_ICONS;
  const text = known
    ? t(`notifications.types.${notification.type}` as 'notifications.types.community-approved')
    : t('notifications.generic');

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl px-3 py-2.5',
        unread && 'bg-app-surface',
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-app-hairline bg-app-bg">
        <Icon className={cn('size-4', meta.className)} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-app-text">{text}</p>
        {reason && <p className="mt-0.5 text-[12px] leading-snug text-app-text-2">{reason}</p>}
        <p className="mt-1 font-mono text-[11px] text-app-muted">
          {formatRelativeTime(notification.createdAt, locale)}
        </p>
      </div>
      {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-app-lime" />}
    </div>
  );
}

/** Sino do rodapé da sidebar: badge de não lidas + popover com as notificações. */
export function NotificationsBell() {
  const t = useTranslations('home');
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(accessToken!),
    enabled: !!accessToken && !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.notifications.readAll(accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        // marca como lidas ao fechar — abrindo, o destaque ainda aparece
        if (!open && unreadCount > 0) readAllMutation.mutate();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('shell.notifications')}
          className="relative flex size-8 items-center justify-center rounded-lg text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text data-[state=open]:bg-app-surface data-[state=open]:text-app-text"
        >
          <Bell className="size-[18px]" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-app-lime px-1 text-[10px] font-bold leading-none text-app-lime-ink">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={10}
        className="w-[340px] rounded-xl border-app-hairline-2 bg-app-card p-2 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
      >
        <p className="px-3 pb-2 pt-1.5 text-[13px] font-semibold text-app-text">
          {t('notifications.title')}
        </p>
        {items.length === 0 ? (
          <p className="px-3 pb-4 pt-2 text-center text-[13px] text-app-muted">
            {t('notifications.empty')}
          </p>
        ) : (
          <div className="flex max-h-[360px] flex-col gap-1 overflow-y-auto scrollbar-app">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
