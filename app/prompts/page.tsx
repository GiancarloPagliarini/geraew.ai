'use client';

import { api } from '@/lib/api';
import type { ApiPromptSection } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';

const TYPE_LABEL: Record<string, string> = {
  text_to_image: 'Texto → Imagem',
  image_to_image: 'Imagem → Imagem',
  text_to_video: 'Texto → Vídeo',
  image_to_video: 'Imagem → Vídeo',
  motion_control: 'Controle de Movimento',
};

function PromptCard({
  title,
  type,
  prompt,
  imageUrl,
  aiModel,
}: {
  title: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  aiModel: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2 transition-colors hover:border-[#f3f0ed]/15">
      <div className="relative aspect-square w-full overflow-hidden bg-[#111618]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[#f3f0ed]/20">
            sem preview
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-[#f3f0ed]/80 backdrop-blur">
          {TYPE_LABEL[type] ?? type}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-[#f3f0ed]">{title}</h3>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 p-1.5 text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed]"
            title="Copiar prompt"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#a2dd00]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-[#f3f0ed]/50">
          {prompt}
        </p>
        {aiModel && (
          <span className="mt-auto inline-block w-fit rounded bg-[#a2dd00]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#a2dd00]">
            {aiModel}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PromptsPage() {
  const { accessToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'prompts'],
    queryFn: () => api.prompts.getAll(accessToken!),
    enabled: !!accessToken,
  });

  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);

  const allPrompts = useMemo(() => {
    const items: {
      id: string;
      title: string;
      type: string;
      prompt: string;
      imageUrl: string | null;
      aiModel: string | null;
      sectionTitle: string;
      categoryTitle: string;
    }[] = [];

    for (const section of (data?.sections ?? []) as ApiPromptSection[]) {
      for (const category of section.categories) {
        for (const p of category.prompts) {
          items.push({
            id: p.id,
            title: p.title,
            type: p.type,
            prompt: p.prompt,
            imageUrl: p.thumbnailUrl ?? p.imageUrl,
            aiModel: p.aiModel,
            sectionTitle: section.title,
            categoryTitle: category.title,
          });
        }
      }
    }
    return items;
  }, [data]);

  const types = useMemo(() => {
    const set = new Set(allPrompts.map((p) => p.type));
    return Array.from(set);
  }, [allPrompts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allPrompts.filter((p) => {
      if (activeType && p.type !== activeType) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.sectionTitle.toLowerCase().includes(q) ||
        p.categoryTitle.toLowerCase().includes(q)
      );
    });
  }, [allPrompts, search, activeType]);

  return (
    <div className="min-h-screen bg-[#111618] text-[#f3f0ed]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-8 flex flex-col gap-3">
          <h1 className="text-3xl font-bold md:text-4xl">Biblioteca de Prompts</h1>
          <p className="max-w-2xl text-sm text-[#f3f0ed]/50 md:text-base">
            Explore todos os prompts disponíveis na plataforma. Clique no ícone de copiar para usar.
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar prompts..."
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
              Todos
            </button>
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeType === t
                    ? 'bg-[#a2dd00] text-[#111618]'
                    : 'border border-[#f3f0ed]/10 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/8'
                }`}
              >
                {TYPE_LABEL[t] ?? t}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
            Erro ao carregar prompts: {(error as Error).message}
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="py-20 text-center text-sm text-[#f3f0ed]/40">
            Nenhum prompt encontrado.
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <>
            <p className="mb-4 text-xs text-[#f3f0ed]/40">
              {filtered.length} {filtered.length === 1 ? 'prompt' : 'prompts'}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <PromptCard
                  key={p.id}
                  title={p.title}
                  type={p.type}
                  prompt={p.prompt}
                  imageUrl={p.imageUrl}
                  aiModel={p.aiModel}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
