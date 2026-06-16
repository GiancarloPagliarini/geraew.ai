'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { MOBILE_NAV, stripLocalePrefix } from '@/lib/home-nav';
import { useShell } from '@/components/app/shell-context';

/**
 * Navegação inferior do mobile (visível abaixo de `lg`). Substitui a sidebar
 * vertical: Pesquisar · Comunidade · Galeria · Workspace · Ferramentas.
 * Barra flutuante fixa, no mesmo recuo dos cards do shell.
 */
export function MobileBottomNav() {
  const t = useTranslations('home');
  const pathname = usePathname();
  const { openPalette } = useShell();
  const current = stripLocalePrefix(pathname);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-3 mb-3 flex items-stretch justify-around gap-1 rounded-[18px] border border-app-hairline bg-app-bg/95 p-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = !!item.href && current === item.href;
          const label = t(`nav.${item.id}`);

          const content = (
            <span
              className={cn(
                'flex w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors duration-200 ease-app',
                active ? 'bg-app-surface text-app-lime' : 'text-app-text-2 hover:text-app-text',
              )}
            >
              <Icon className="size-[21px] shrink-0" strokeWidth={1.8} />
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
            </span>
          );

          if (item.action === 'palette') {
            return (
              <button key={item.id} type="button" onClick={openPalette} className="flex flex-1 basis-0">
                {content}
              </button>
            );
          }
          return (
            <Link key={item.id} href={item.href!} className="flex flex-1 basis-0">
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
