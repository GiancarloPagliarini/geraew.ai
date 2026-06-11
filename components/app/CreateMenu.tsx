'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QUICK_ACTIONS } from '@/lib/home-nav';

interface CreateMenuProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

/** Menu do botão "Criar": atalhos de criação compartilhados com as ações rápidas. */
export function CreateMenu({ children, align = 'start' }: CreateMenuProps) {
  const t = useTranslations('home');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={8}
        className="w-60 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
      >
        {QUICK_ACTIONS.map(({ id, icon: Icon, href }) => (
          <DropdownMenuItem key={id} asChild className="cursor-pointer rounded-lg px-2.5 py-2 text-[14px] font-medium text-app-text focus:bg-app-surface focus:text-app-text">
            <Link href={href}>
              <Icon className="size-[17px] text-app-text-2" strokeWidth={1.8} />
              {t(`quick.${id}.title`)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
