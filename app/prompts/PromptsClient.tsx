'use client';

import { Search, Copy, Check, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiPromptSection } from '@/lib/api';

const VIDEO_TYPES = new Set(['text_to_video', 'image_to_video', 'motion_control']);

function buildWorkspaceHref(prompt: string, type: string) {
  const panel = VIDEO_TYPES.has(type) ? 'generate-video' : 'generate-image';
  const qs = new URLSearchParams({ prompt, panel });
  return `/workspace?${qs.toString()}`;
}

interface CardPrompt {
  id: string;
  title: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  aiModel: string | null;
}

function typeLabel(t: ReturnType<typeof useTranslations>, type: string): string {
  const known = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'motion_control'];
  if (known.includes(type)) return t(`types.${type}`);
  return type;
}

function PromptCard({ p }: { p: CardPrompt }) {
  const t = useTranslations('promptsLibrary');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(p.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2 transition-colors hover:border-[#f3f0ed]/15">
      <div className="relative aspect-square w-full overflow-hidden bg-[#111618]">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#f3f0ed]/20">
            {t('noPreview')}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-[#f3f0ed]/80 backdrop-blur">
          {typeLabel(t, p.type)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-[#f3f0ed]">{p.title}</h3>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 p-1.5 text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed]"
            title={t('copyPrompt')}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#a2dd00]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#f3f0ed]/50">
          {p.prompt}
        </p>
        {p.aiModel && (
          <span className="inline-block w-fit rounded bg-[#a2dd00]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#a2dd00]">
            {p.aiModel}
          </span>
        )}
        <a
          href={buildWorkspaceHref(p.prompt, p.type)}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00] px-3 py-2 text-xs font-semibold text-[#111618] transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(162,221,0,0.25)]"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {t('usePrompt')}
        </a>
      </div>
    </div>
  );
}

export function PromptsClient({ sections }: { sections: ApiPromptSection[] }) {
  const t = useTranslations('promptsLibrary');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const s of sections) {
      for (const c of s.categories) {
        for (const p of c.prompts) set.add(p.type);
      }
    }
    return Array.from(set);
  }, [sections]);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();

    return sections
      .filter((s) => !activeSection || s.id === activeSection)
      .map((section) => ({
        ...section,
        categories: section.categories
          .map((category) => ({
            ...category,
            prompts: category.prompts.filter((p) => {
              if (activeType && p.type !== activeType) return false;
              if (!q) return true;
              return (
                p.title.toLowerCase().includes(q) ||
                p.prompt.toLowerCase().includes(q) ||
                category.title.toLowerCase().includes(q) ||
                section.title.toLowerCase().includes(q)
              );
            }),
          }))
          .filter((c) => c.prompts.length > 0),
      }))
      .filter((s) => s.categories.length > 0);
  }, [sections, search, activeType, activeSection]);

  const totalFiltered = useMemo(
    () =>
      filteredSections.reduce(
        (sum, s) => sum + s.categories.reduce((cs, c) => cs + c.prompts.length, 0),
        0,
      ),
    [filteredSections],
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 pl-9 pr-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeType === null
                ? 'bg-[#a2dd00] text-[#111618]'
                : 'border border-[#f3f0ed]/10 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/8'
            }`}
          >
            {t('filterAll')}
          </button>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeType === type
                  ? 'bg-[#a2dd00] text-[#111618]'
                  : 'border border-[#f3f0ed]/10 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/8'
              }`}
            >
              {typeLabel(t, type)}
            </button>
          ))}
        </div>
      </div>

      {sections.length > 1 && (
        <div className="mb-8 -mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
            <button
              onClick={() => setActiveSection(null)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSection === null
                  ? 'border-[#a2dd00]/40 bg-[#a2dd00]/10 text-[#a2dd00]'
                  : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/8'
              }`}
            >
              {t('allSections')}
            </button>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? 'border-[#a2dd00]/40 bg-[#a2dd00]/10 text-[#a2dd00]'
                    : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/8'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mb-6 text-xs text-[#f3f0ed]/40">
        {t('promptCount', { count: totalFiltered })}
      </p>

      {filteredSections.length === 0 ? (
        <div className="py-20 text-center text-sm text-[#f3f0ed]/40">
          {t('noResults')}
        </div>
      ) : (
        <div className="flex flex-col gap-14">
          {filteredSections.map((section) => (
            <section key={section.id} className="flex flex-col gap-8">
              <div className="flex flex-col gap-1 border-b border-[#f3f0ed]/8 pb-3">
                <h2 className="text-2xl font-bold text-[#f3f0ed] md:text-3xl">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-sm text-[#f3f0ed]/50">{section.description}</p>
                )}
              </div>

              {section.categories.map((category) => (
                <div key={category.id} className="flex flex-col gap-4">
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-base font-semibold text-[#f3f0ed]/90 md:text-lg">
                      {category.title}
                    </h3>
                    <span className="text-xs text-[#f3f0ed]/30">
                      {t('promptCount', { count: category.prompts.length })}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {category.prompts.map((p) => (
                      <PromptCard
                        key={p.id}
                        p={{
                          id: p.id,
                          title: p.title,
                          type: p.type,
                          prompt: p.prompt,
                          imageUrl: p.thumbnailUrl ?? p.imageUrl,
                          aiModel: p.aiModel,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
