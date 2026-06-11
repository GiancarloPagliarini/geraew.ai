'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Lock, Pin, Plus } from 'lucide-react';
import { PINNED_TOOLS } from '@/lib/home-nav';
import { PlansModal } from '@/components/editor/PlansModal';

function PanelHeader({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-1.5">
      <h3 className="text-[16px] font-semibold text-app-text">{title}</h3>
      <ChevronRight className="size-4 text-app-muted" strokeWidth={1.8} />
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto flex size-[30px] items-center justify-center rounded-lg border border-app-hairline text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-card hover:text-app-text"
        >
          <Plus className="size-4" strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

/** Painéis "Projetos" e "Ferramentas" do dashboard. */
// TODO(reestruturação): Projetos é estático por enquanto — projetos de equipe
// chegam junto com a feature de colaboração.
export function HomePanels() {
  const t = useTranslations('home');
  const [plansOpen, setPlansOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Projetos */}
      <section className="rounded-[10px] border border-app-hairline bg-app-surface p-[18px]">
        <PanelHeader title={t('panels.projects')} />
        <div className="flex flex-col">
          <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors duration-200 ease-app hover:bg-app-card">
            <span className="size-3 rounded-[4px] bg-app-lime" />
            <span className="text-[14.5px] text-app-text">{t('panels.personal')}</span>
            <Lock className="ml-auto size-[15px] text-app-muted" strokeWidth={1.8} />
          </div>
          <div className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors duration-200 ease-app hover:bg-app-card">
            <span className="size-3 rounded-[4px] bg-[#60a5fa]" />
            <span className="text-[14.5px] text-app-text">{t('panels.teamProject')}</span>
            <button
              type="button"
              onClick={() => setPlansOpen(true)}
              className="ml-auto rounded-md border border-[rgba(168,85,247,0.4)] bg-[rgba(168,85,247,0.12)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-app-violet-2 transition-colors duration-200 ease-app hover:bg-[rgba(168,85,247,0.2)]"
            >
              {t('panels.upgrade')}
            </button>
          </div>
        </div>
      </section>

      {/* Ferramentas fixadas */}
      <section className="rounded-[10px] border border-app-hairline bg-app-surface p-[18px]">
        <PanelHeader title={t('panels.tools')} />
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

      {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} />}
    </div>
  );
}
