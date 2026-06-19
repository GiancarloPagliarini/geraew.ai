'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Ellipsis, FileText, PanelLeft, Plus, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MAIN_NAV, TOOLS_NAV, stripLocalePrefix, type HomeNavItem } from '@/lib/home-nav';
import { useShell } from '@/components/app/shell-context';
import { CreateMenu } from '@/components/app/CreateMenu';
import { NotificationsBell } from '@/components/app/NotificationsBell';
import { SidebarWeeklyClaim } from '@/components/app/SidebarWeeklyClaim';
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

/** Glifo do WhatsApp (lucide não tem ícone de marca). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/** Glifo do Discord (lucide não tem ícone de marca). */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

const WHATSAPP_SUPPORT_HREF = `https://wa.me/5551997053222?text=${encodeURIComponent('Olá! Preciso de ajuda com a Geraew.')}`;
const DISCORD_INVITE_HREF = 'https://discord.gg/7QCn9CQRDk';

export function AppSidebar() {
  const t = useTranslations('home');
  const { sidebarCollapsed: collapsed, toggleSidebar } = useShell();

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col rounded-[18px] border border-app-hairline bg-app-bg p-3 transition-[width] duration-200 ease-app lg:flex',
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

      {/* navegação — rola internamente quando a tela é baixa (notebooks), sem
          empurrar o rodapé nem criar scroll na página */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar">
        <nav className="flex flex-col gap-0.5">
          {MAIN_NAV.map((item) => (
            <NavRow key={item.id} item={item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="my-4 h-px shrink-0 bg-app-hairline" />

        {/* ferramentas */}
        <nav className="flex flex-col gap-0.5">
          {TOOLS_NAV.map((item) => (
            <NavRow key={item.id} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </div>

      {/* resgate semanal (+4 vídeos toda quarta) */}
      <div className="shrink-0 pt-3">
        <SidebarWeeklyClaim collapsed={collapsed} />
      </div>

      {/* rodapé */}
      <div className={cn('flex shrink-0 items-center gap-1 pt-4', collapsed && 'flex-col')}>
        <NotificationsBell />
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={WHATSAPP_SUPPORT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('shell.help')}
              className="relative flex size-8 items-center justify-center rounded-lg text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <WhatsAppIcon className="size-[17px]" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>{t('shell.help')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={DISCORD_INVITE_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="relative flex size-8 items-center justify-center rounded-lg text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <DiscordIcon className="size-[18px]" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>Discord</TooltipContent>
        </Tooltip>
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
                <Link href="/termos-de-uso">
                  <FileText className="size-4 text-app-muted" strokeWidth={1.8} />
                  {t('shell.terms')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text">
                <Link href="/politica-de-privacidade">
                  <ShieldCheck className="size-4 text-app-muted" strokeWidth={1.8} />
                  {t('shell.privacy')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
