'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Images, LogOut, UserRound } from 'lucide-react';
import { SCREEN_TITLES, stripLocalePrefix } from '@/lib/home-nav';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const itemClass =
  'cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text';

export function AppTopbar() {
  const t = useTranslations('home');
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, logout, loading } = useAuth();
  const { openLoginModal } = useLoginModal();

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const screen = SCREEN_TITLES[stripLocalePrefix(pathname)];

  // saldo de créditos — vira o anel de progresso em volta do avatar
  const { data: balance } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken && !!user,
    staleTime: 30_000,
  });

  const used = balance?.planCreditsUsed ?? 0;
  const remaining = balance?.planCreditsRemaining ?? 0;
  const total = used + remaining;
  const fraction = total > 0 ? remaining / total : 1;
  const RING_R = 19;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - fraction);
  const ringColor = fraction > 0.25 ? '#a2dd00' : fraction > 0.1 ? '#f59e0b' : '#ef4444';

  return (
    <header className="flex items-center justify-between gap-5 px-7 pt-5">
      {/* título da tela (vazio no Início) */}
      <div className="flex min-w-0 items-center gap-3">
        {screen && (
          <>
            <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-app-hairline bg-app-surface">
              <screen.icon className="size-[18px] text-app-lime" strokeWidth={1.8} />
            </span>
            <h1 className="truncate text-[18px] font-bold text-app-text">
              {t(`nav.${screen.id}`)}
            </h1>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-5">
      <Link
        href="/pricing"
        className="text-[14.5px] font-semibold text-app-lime transition-colors duration-200 ease-app hover:text-app-lime-bright"
      >
        {t('shell.pricing')}
      </Link>

      {!loading && !user ? (
        <button
          type="button"
          onClick={() => openLoginModal()}
          className="rounded-[10px] border border-app-hairline-2 px-4 py-2 text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-surface"
        >
          {t('shell.signIn')}
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('shell.account')}
              className="group relative size-9 rounded-full outline-none"
            >
              {/* glow lime bem sutil no hover/foco */}
              <span className="pointer-events-none absolute -inset-0.5 rounded-full bg-app-lime/0 blur-[3px] transition-colors duration-300 ease-app group-hover:bg-app-lime/10 group-data-[state=open]:bg-app-lime/10" />
              {/* anel de progresso: fração restante dos créditos do plano */}
              <svg className="pointer-events-none absolute -inset-[3px] size-[42px]" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r={RING_R} fill="none" stroke="rgba(243,240,237,0.08)" strokeWidth="2" />
                <circle
                  cx="21"
                  cy="21"
                  r={RING_R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 21 21)"
                  style={{
                    transition:
                      'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </svg>
              <span className="relative flex size-full overflow-hidden rounded-full bg-app-card transition-[filter] duration-200 ease-app group-hover:brightness-110">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} width={36} height={36} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[14px] font-bold text-app-lime">
                    {initial}
                  </span>
                )}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-60 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          >
            {user && (
              <>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13.5px] font-semibold text-app-text">{user.name}</p>
                  <p className="truncate text-[12px] text-app-muted">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-app-hairline" />
              </>
            )}
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/perfil">
                <UserRound className="size-4" strokeWidth={1.8} />
                {t('shell.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/perfil?tab=posts">
                <Images className="size-4" strokeWidth={1.8} />
                {t('shell.posts')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/perfil?tab=usage">
                <BarChart3 className="size-4" strokeWidth={1.8} />
                {t('shell.usage')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-app-hairline" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-red-400 focus:bg-app-surface focus:text-red-400"
              onClick={() => {
                logout();
                router.push('/');
              }}
            >
              <LogOut className="size-4 text-red-400" strokeWidth={1.8} />
              {t('shell.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>

    </header>
  );
}
