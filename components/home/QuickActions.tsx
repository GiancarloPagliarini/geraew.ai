'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { QUICK_ACTIONS } from '@/lib/home-nav';

/** Grade de atalhos de criação (Workspace, Imagem, Vídeo, Áudio, Avatares, TikTok Shop). */
export function QuickActions() {
  const t = useTranslations('home');

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {QUICK_ACTIONS.map(({ id, icon: Icon, href }) => (
        <Link
          key={id}
          href={href}
          className="group flex items-center gap-3.5 rounded-[14px] border border-app-hairline bg-app-card p-3.5 transition-all duration-200 ease-app hover:-translate-y-px hover:border-app-hairline-2 hover:bg-app-card-hover"
        >
          <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl border border-app-hairline bg-app-bg transition-colors duration-200 ease-app group-hover:border-[rgba(162,221,0,0.45)] group-hover:bg-[rgba(162,221,0,0.06)]">
            <Icon className="size-[21px] text-app-text-2 transition-colors duration-200 ease-app group-hover:text-app-lime" strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-app-text">
              {t(`quick.${id}.title`)}
            </span>
            <span className="block truncate text-[13px] text-app-text-2">
              {t(`quick.${id}.desc`)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
