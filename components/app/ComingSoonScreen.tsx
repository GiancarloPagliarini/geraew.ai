'use client';

import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/app/EmptyState';
import { SCREEN_TITLES } from '@/lib/home-nav';

/** Tela bloqueada temporariamente: substitui a view enquanto a ferramenta está fora do ar. */
export function ComingSoonScreen({ route }: { route: keyof typeof SCREEN_TITLES }) {
  const t = useTranslations('home');
  const { id, icon } = SCREEN_TITLES[route];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 pt-6 lg:px-11">
        <EmptyState
          icon={icon}
          title={t(`nav.${id}`)}
          hint={t('soon')}
          cta={{ label: t('nav.todasFerramentas'), href: '/tools' }}
        />
      </div>
    </div>
  );
}
