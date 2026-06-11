'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Bell, Ellipsis, CircleHelp, Moon, PanelLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAIN_NAV, TOOLS_NAV, stripLocalePrefix, type HomeNavItem } from '@/lib/home-nav';
import { useShell } from '@/components/app/shell-context';
import { CreateMenu } from '@/components/app/CreateMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function NavRow({ item, collapsed }: { item: HomeNavItem; collapsed: boolean }) {
  const t = useTranslations('home');
  const pathname = usePathname();
  const { openPalette } = useShell();
  const Icon = item.icon;
  const active = !!item.href && stripLocalePrefix(pathname) === item.href;
  const label = t(`nav.${item.id}`);

  const row = (
    <span
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-[9px] text-[14.5px] transition-colors duration-200 ease-app',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-app-surface text-app-text'
          : 'text-app-text-2 hover:bg-app-surface hover:text-app-text',
        item.soon && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-app-text-2',
      )}
    >
      <Icon className={cn('size-[19px] shrink-0', active && 'text-app-lime')} strokeWidth={1.8} />
      {!collapsed && <span className="truncate">{label}</span>}
    </span>
  );

  let trigger: React.ReactNode;
  if (item.soon) {
    trigger = <button type="button" aria-disabled className="w-full">{row}</button>;
  } else if (item.action === 'palette') {
    trigger = (
      <button type="button" onClick={openPalette} className="w-full">
        {row}
      </button>
    );
  } else {
    trigger = <Link href={item.href!}>{row}</Link>;
  }

  if (collapsed || item.soon) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
          {item.soon ? ` — ${t('soon')}` : ''}
        </TooltipContent>
      </Tooltip>
    );
  }
  return trigger;
}

function FooterIcon({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className="relative flex size-8 items-center justify-center rounded-lg text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const t = useTranslations('home');
  const { sidebarCollapsed: collapsed, toggleSidebar } = useShell();
  const soonToast = () => toast.info(t('soon'));

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col rounded-[18px] border border-app-hairline bg-app-bg p-3 transition-[width] duration-200 ease-app',
        collapsed ? 'w-[68px]' : 'w-[248px]',
      )}
    >
      {/* marca + colapsar */}
      <div className={cn('flex items-center gap-2.5 px-1.5 pb-4 pt-1.5', collapsed && 'flex-col px-0')}>
        <Link href="/home" className="flex min-w-0 items-center gap-2.5">
          <Image src="/logo_2.svg" alt="Geraew" width={28} height={28} className="size-7 shrink-0" />
          {!collapsed && <span className="truncate text-[19px] font-bold text-app-text">Geraew</span>}
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={t('shell.toggleSidebar')}
          className={cn(
            'flex size-7 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text',
            !collapsed && 'ml-auto',
          )}
        >
          <PanelLeft className="size-[17px]" strokeWidth={1.8} />
        </button>
      </div>

      {/* Criar */}
      <CreateMenu>
        <button
          type="button"
          className={cn(
            'mb-4 flex h-11 w-full items-center gap-2 rounded-[10px] bg-app-lime text-[15px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover',
            collapsed ? 'justify-center' : 'justify-start px-4',
          )}
        >
          <Plus className="size-[18px]" strokeWidth={2.2} />
          {!collapsed && t('shell.create')}
        </button>
      </CreateMenu>

      {/* navegação principal */}
      <nav className="flex flex-col gap-0.5">
        {MAIN_NAV.map((item) => (
          <NavRow key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="my-4 h-px bg-app-hairline" />

      {/* ferramentas */}
      <nav className="flex flex-col gap-0.5">
        {TOOLS_NAV.map((item) => (
          <NavRow key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* rodapé */}
      <div className={cn('mt-auto flex items-center gap-1 pt-4', collapsed && 'flex-col')}>
        <FooterIcon label={t('shell.help')} onClick={soonToast}>
          <CircleHelp className="size-[18px]" strokeWidth={1.8} />
        </FooterIcon>
        <FooterIcon label={t('shell.notifications')} onClick={soonToast}>
          <Bell className="size-[18px]" strokeWidth={1.8} />
        </FooterIcon>
        <FooterIcon label={t('shell.theme')} onClick={soonToast}>
          <Moon className="size-[18px]" strokeWidth={1.8} />
        </FooterIcon>
        <div className={cn(!collapsed && 'ml-auto')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('shell.more')}
                className="flex size-8 items-center justify-center rounded-lg text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
              >
                <Ellipsis className="size-[18px]" strokeWidth={1.8} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={8}
              className="w-56 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
            >
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text">
                <Link href="/termos-de-uso">{t('shell.terms')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text">
                <Link href="/politica-de-privacidade">{t('shell.privacy')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
