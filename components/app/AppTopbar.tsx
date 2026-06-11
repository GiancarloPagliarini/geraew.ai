'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BarChart3, CreditCard, LogOut, UserRound } from 'lucide-react';
import { SCREEN_TITLES, stripLocalePrefix } from '@/lib/home-nav';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { PlansModal } from '@/components/editor/PlansModal';
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
  const { user, logout, loading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [plansOpen, setPlansOpen] = useState(false);

  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();
  const screen = SCREEN_TITLES[stripLocalePrefix(pathname)];

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
      <button
        type="button"
        onClick={() => setPlansOpen(true)}
        className="text-[14.5px] font-semibold text-app-lime transition-colors duration-200 ease-app hover:text-app-lime-bright"
      >
        {t('shell.pricing')}
      </button>

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
              className="size-9 overflow-hidden rounded-full border border-app-hairline-2 bg-app-card transition-transform duration-200 ease-app hover:scale-105"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} width={36} height={36} className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-[14px] font-bold text-app-lime">
                  {initial}
                </span>
              )}
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
              <Link href="/creditos">
                <CreditCard className="size-4" strokeWidth={1.8} />
                {t('shell.credits')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={itemClass}>
              <Link href="/uso">
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

      {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} />}
    </header>
  );
}
