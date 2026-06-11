'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  AudioLines,
  Eraser,
  Flame,
  Image as ImageIcon,
  LayoutGrid,
  Mic,
  ScanFace,
  Scissors,
  Search,
  SlidersHorizontal,
  SquarePlay,
  Volume2,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { cn, normalizeSearch } from '@/lib/utils';
import { EmptyState } from '@/components/app/EmptyState';

interface Tool {
  /** chave i18n em `home.tools.items.*` */
  id: string;
  icon: LucideIcon;
  href?: string;
  soon?: boolean;
}

interface ToolSection {
  /** chave i18n em `home.tools.sections.*` */
  id: string;
  tools: Tool[];
}

// TODO(reestruturação): apontar para as telas dedicadas quando saírem do
// workspace; itens `soon` viram links quando a ferramenta existir.
const TOOL_SECTIONS: ToolSection[] = [
  {
    id: 'image',
    tools: [
      { id: 'gerarImagens', icon: ImageIcon, href: '/image' },
      { id: 'melhorarImagem', icon: Wand2, href: '/workspace' },
      { id: 'editarImagens', icon: SlidersHorizontal, href: '/workspace' },
      { id: 'removerFundo', icon: Eraser, soon: true },
    ],
  },
  {
    id: 'video',
    tools: [
      { id: 'gerarVideos', icon: SquarePlay, href: '/video' },
      { id: 'editarVideos', icon: Scissors, href: '/workspace' },
    ],
  },
  {
    id: 'audio',
    tools: [
      { id: 'textoParaVoz', icon: Mic, href: '/voice' },
      { id: 'musica', icon: AudioLines, soon: true },
      { id: 'efeitosSonoros', icon: Volume2, soon: true },
    ],
  },
  {
    id: 'avatars',
    tools: [{ id: 'avatares', icon: ScanFace, href: '/workspace' }],
  },
  {
    id: 'commerce',
    tools: [{ id: 'tiktokShop', icon: Flame, href: '/workspace' }],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  const t = useTranslations('home');
  const Icon = tool.icon;

  const card = (
    <div
      className={cn(
        'group relative h-full rounded-[14px] border border-app-hairline bg-app-card p-5 transition-all duration-200 ease-app',
        tool.soon
          ? 'opacity-60'
          : 'hover:-translate-y-0.5 hover:border-[rgba(162,221,0,0.45)]',
      )}
    >
      {/* seta no hover */}
      {!tool.soon && (
        <ArrowUpRight
          className="absolute right-4 top-4 size-[18px] text-app-lime opacity-0 transition-opacity duration-200 ease-app group-hover:opacity-100"
          strokeWidth={2}
        />
      )}
      {tool.soon && (
        <span className="absolute right-4 top-4 rounded-md border border-app-hairline-2 px-1.5 py-0.5 font-mono text-[10px] text-app-muted">
          {t('soon')}
        </span>
      )}
      <span className="flex size-[44px] items-center justify-center rounded-xl border border-[rgba(162,221,0,0.25)] bg-[rgba(162,221,0,0.08)]">
        <Icon className="size-[21px] text-app-lime" strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-[15.5px] font-semibold text-app-text">
        {t(`tools.items.${tool.id}.title`)}
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-app-text-2">
        {t(`tools.items.${tool.id}.desc`)}
      </p>
    </div>
  );

  if (tool.soon || !tool.href) {
    return (
      <button type="button" onClick={() => toast.info(t('soon'))} className="block h-full w-full text-left">
        {card}
      </button>
    );
  }
  return (
    <Link href={tool.href} className="block h-full">
      {card}
    </Link>
  );
}

export function ToolsView() {
  const t = useTranslations('home');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return TOOL_SECTIONS;
    return TOOL_SECTIONS.map((section) => ({
      ...section,
      tools: section.tools.filter((tool) =>
        normalizeSearch(
          `${t(`tools.items.${tool.id}.title`)} ${t(`tools.items.${tool.id}.desc`)}`,
        ).includes(q),
      ),
    })).filter((section) => section.tools.length > 0);
  }, [query, t]);

  return (
    // toda a área é o container de scroll; busca fica sticky no topo
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 lg:px-11">
        <div className="sticky top-0 z-10 bg-app-bg pb-4 pt-6">
          <div className="flex h-[46px] items-center gap-3 rounded-[14px] border border-app-hairline bg-app-surface px-4 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
            <Search className="size-[18px] shrink-0 text-app-muted" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('tools.searchPlaceholder')}
              className="w-full bg-transparent text-[14.5px] text-app-text outline-none placeholder:text-app-muted"
            />
          </div>
        </div>

        {sections.length === 0 ? (
          <EmptyState icon={LayoutGrid} title={t('tools.empty')} hint={t('tools.emptyHint')} />
        ) : (
          <div className="flex flex-col gap-8">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="mb-4 flex items-center gap-2.5">
                  <h2 className="text-[13px] font-bold text-app-text">
                    {t(`tools.sections.${section.id}`)}
                  </h2>
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-app-surface px-1.5 font-mono text-[10.5px] text-app-muted">
                    {section.tools.length}
                  </span>
                  <div className="h-px flex-1 bg-app-hairline" />
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                  {section.tools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
