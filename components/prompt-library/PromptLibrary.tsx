'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Library, Search, Wand2 } from 'lucide-react';
import type { ApiPromptSection } from '@/lib/api';
import { normalizeSearch } from '@/lib/utils';
import { EmptyState } from '@/components/app/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Quantos cards entram no DOM por "página" do scroll infinito. */
const PAGE_SIZE = 20;

const VIDEO_TYPES = new Set(['text_to_video', 'image_to_video', 'motion_control']);

function buildWorkspaceHref(prompt: string, type: string) {
  const panel = VIDEO_TYPES.has(type) ? 'generate-video' : 'generate-image';
  const qs = new URLSearchParams({ prompt, panel });
  return `/workspace?${qs.toString()}`;
}

interface LibraryPrompt {
  id: string;
  title: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  category: string;
}

function PromptCard({ p }: { p: LibraryPrompt }) {
  const t = useTranslations('home');
  const [copied, setCopied] = useState(false);
  const image = p.thumbnailUrl || p.imageUrl;

  const copy = async () => {
    await navigator.clipboard.writeText(p.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] border border-app-hairline bg-app-card transition-all duration-200 ease-app hover:-translate-y-0.5 hover:border-app-hairline-2">
      {/* mídia 3:4 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[linear-gradient(135deg,#1d2628,#161d1f)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(162,221,0,0.08),transparent_55%)]" />
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={p.title}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-app group-hover:scale-[1.03]"
          />
        )}
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-[rgba(13,16,17,0.65)] px-2.5 py-1 text-[11px] font-bold text-app-text backdrop-blur-md">
          <Library className="size-3 text-app-lime" strokeWidth={2} />
          {p.category}
        </span>
      </div>

      {/* prompt + ações */}
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <p className="line-clamp-3 text-[13.5px] leading-relaxed text-app-text-2">{p.prompt}</p>
        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[10px] border border-app-hairline bg-app-surface text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover"
          >
            {copied ? (
              <>
                <Check className="size-[15px] text-app-lime" strokeWidth={2} />
                {t('library.copied')}
              </>
            ) : (
              <>
                <Copy className="size-[15px]" strokeWidth={1.8} />
                {t('library.copy')}
              </>
            )}
          </button>
          <Link
            href={buildWorkspaceHref(p.prompt, p.type)}
            aria-label={t('library.use')}
            title={t('library.use')}
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-app-lime text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover"
          >
            <Wand2 className="size-[16px]" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PromptLibrary({ sections }: { sections: ApiPromptSection[] }) {
  const t = useTranslations('home');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const prompts = useMemo<LibraryPrompt[]>(
    () =>
      sections.flatMap((s) =>
        s.categories.flatMap((c) =>
          c.prompts.map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type,
            prompt: p.prompt,
            imageUrl: p.imageUrl,
            thumbnailUrl: p.thumbnailUrl,
            category: c.title,
          })),
        ),
      ),
    [sections],
  );

  const categories = useMemo(
    () => [...new Set(prompts.map((p) => p.category))].sort((a, b) => a.localeCompare(b)),
    [prompts],
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return prompts.filter((p) => {
      if (category && p.category !== category) return false;
      if (q && !normalizeSearch(`${p.title} ${p.prompt}`).includes(q)) return false;
      return true;
    });
  }, [prompts, category, query]);

  const visible = filtered.slice(0, visibleCount);

  // scroll infinito: carrega mais uma "página" quando o sentinela se aproxima
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { root: scrollRef.current, rootMargin: '600px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const selectCategory = (value: string) => {
    setCategory(value === 'all' ? null : value);
    setVisibleCount(PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    // toda a área da biblioteca é o container de scroll — a roda funciona em
    // qualquer ponto; busca e chips ficam sticky no topo
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-10 lg:px-11">
        <div className="sticky top-0 z-10 bg-app-bg pb-3 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* busca */}
            <div className="flex h-[46px] items-center gap-3 rounded-[14px] border border-app-hairline bg-app-surface px-4 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)] sm:flex-1">
              <Search className="size-[18px] shrink-0 text-app-muted" strokeWidth={1.8} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
                placeholder={t('library.searchPlaceholder')}
                className="w-full bg-transparent text-[14.5px] text-app-text outline-none placeholder:text-app-muted"
              />
            </div>

            {/* filtro de categoria */}
            <Select value={category ?? 'all'} onValueChange={selectCategory}>
              <SelectTrigger
                className="!h-[46px] w-full shrink-0 rounded-xl border-app-hairline bg-app-surface px-3.5 text-[13.5px] font-semibold text-app-text shadow-none transition-colors duration-200 ease-app hover:border-app-hairline-2 focus-visible:border-[rgba(162,221,0,0.4)] focus-visible:ring-0 sm:w-[230px] dark:bg-app-surface dark:hover:bg-app-surface [&_svg:not([class*='text-'])]:text-app-muted"
              >
                <Library className="size-[16px] !text-app-lime" strokeWidth={1.8} />
                <span className="flex-1 truncate text-left">
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                sideOffset={6}
                className="rounded-xl border-app-hairline-2 bg-app-card text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
              >
                <SelectItem
                  value="all"
                  className="rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text"
                >
                  {t('library.all')}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text"
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* total */}
          <p className="mt-2.5 px-1 font-mono text-[12px] text-app-muted">
            {t('library.count', { count: filtered.length })}
          </p>
        </div>

        {prompts.length === 0 ? (
          <EmptyState icon={Library} title={t('library.loadError')} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Search} title={t('library.empty')} hint={t('library.emptyHint')} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
            {visible.map((p) => (
              <PromptCard key={p.id} p={p} />
            ))}
          </div>
        )}
        {/* sentinela do scroll infinito */}
        <div ref={sentinelRef} className="h-px" />
      </div>
    </div>
  );
}

