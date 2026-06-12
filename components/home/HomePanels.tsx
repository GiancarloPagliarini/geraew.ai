'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Pin } from 'lucide-react';
import { api } from '@/lib/api';
import { PINNED_TOOLS } from '@/lib/home-nav';

function PanelHeader({ title, href }: { title: string; href?: string }) {
  const inner = (
    <>
      <h3 className="text-[16px] font-semibold text-app-text">{title}</h3>
      <ChevronRight className="size-4 text-app-muted transition-transform duration-200 ease-app group-hover/header:translate-x-0.5" strokeWidth={1.8} />
    </>
  );

  if (href) {
    return (
      <Link href={href} className="group/header mb-3 flex items-center gap-1.5">
        {inner}
      </Link>
    );
  }
  return <div className="mb-3 flex items-center gap-1.5">{inner}</div>;
}

/** Painéis "Biblioteca de Prompts" e "Ferramentas" do dashboard. */
export function HomePanels() {
  const t = useTranslations('home');

  const { data, isPending } = useQuery({
    queryKey: ['prompts', 'public'],
    queryFn: () => api.prompts.getAllPublic(),
    staleTime: 5 * 60_000,
  });

  // alguns prompts com imagem para os tiles do painel
  const tiles = useMemo(() => {
    const sections = data?.sections ?? [];
    return sections
      .flatMap((s) =>
        s.categories.flatMap((c) =>
          c.prompts.map((p) => ({
            id: p.id,
            image: p.thumbnailUrl || p.imageUrl,
            category: c.title,
          })),
        ),
      )
      .filter((p) => p.image)
      .slice(0, 4);
  }, [data]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Biblioteca de Prompts */}
      <section className="rounded-[10px] border border-app-hairline bg-app-surface p-[18px]">
        <PanelHeader title={t('nav.prompts')} href="/prompt-library" />
        {isPending ? (
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-[3/4] skeleton-app rounded-lg bg-app-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {tiles.map((tile) => (
              <Link
                key={tile.id}
                href="/prompt-library"
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-app-hairline transition-colors duration-200 ease-app hover:border-app-hairline-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.image!}
                  alt={tile.category}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-app group-hover:scale-[1.05]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(13,16,17,0.78),transparent)] px-2 pb-1.5 pt-5">
                  <p className="truncate text-[10.5px] font-semibold text-white">{tile.category}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Ferramentas fixadas */}
      <section className="rounded-[10px] border border-app-hairline bg-app-surface p-[18px]">
        <PanelHeader title={t('panels.tools')} href="/tools" />
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {PINNED_TOOLS.map(({ id, icon: Icon, href }, i) => (
            <Link
              key={id}
              href={href}
              className="group flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors duration-200 ease-app hover:bg-app-card"
            >
              <Icon className="size-[17px] text-app-text-2 transition-colors duration-200 ease-app group-hover:text-app-lime" strokeWidth={1.8} />
              <span className="truncate text-[14.5px] text-app-text">{t(`panels.pinned.${id}`)}</span>
              {i === 1 && <Pin className="ml-auto size-[14px] rotate-45 text-app-muted" strokeWidth={1.8} />}
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
