'use client';

import {
  Copy, Check, X, ImageIcon, Film, Search,
  Camera, Sparkles, Dumbbell, Sun, ZoomIn, Mic, Moon, PersonStanding, Package, Target, Hand, Gem,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api, ApiPromptSection } from '@/lib/api';

interface Prompt {
  id: string;
  type: string;
  prompt: string;
  image?: string;
}

interface Category {
  id: string;
  title: string;
  prompts: Prompt[];
}

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  categories: Category[];
}

const iconMap: Record<string, LucideIcon> = {
  Camera, Sparkles, Dumbbell, Sun, ZoomIn, Mic, Moon, PersonStanding, Package, Target, Hand, Gem,
  Image: ImageIcon,
};

function mapApiSectionsToSections(apiSections: ApiPromptSection[]): Section[] {
  return apiSections.map((s) => ({
    id: s.id,
    icon: (s.icon && iconMap[s.icon]) || Sparkles,
    title: s.title,
    description: s.description || '',
    categories: s.categories.map((c) => ({
      id: c.id,
      title: c.title,
      prompts: c.prompts.map((p) => ({
        id: p.id,
        type: p.type,
        prompt: p.prompt,
        image: p.imageUrl || undefined,
      })),
    })),
  }));
}

function PromptCard({ item, isCopied, onImage, onVideo, onCopy }: {
  item: Prompt;
  isCopied: boolean;
  onImage: () => void;
  onVideo: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="group relative rounded-xl overflow-hidden ring-1 ring-white/[0.06] hover:ring-[#a2dd00]/25 transition-all duration-300">
      <div className="relative aspect-[4/5] overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#1d2628] to-[#161e20] flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-white/[0.04]" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className="inline-block text-[8px] font-bold uppercase tracking-widest text-[#a2dd00] bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full ring-1 ring-[#a2dd00]/20">
            {item.type}
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 backdrop-blur-md text-white/50 ring-1 ring-white/[0.08] hover:bg-black/60 hover:text-white/80 active:scale-[0.95] transition-all"
        >
          {isCopied ? <Check className="h-3 w-3 text-[#a2dd00]" /> : <Copy className="h-3 w-3" />}
        </button>

        {/* Bottom content */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <p className="text-[10px] leading-relaxed text-white/65 line-clamp-2">
            {item.prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptsDialog({ open, onOpenChange }: PromptsDialogProps) {
  const { requestPanelWithPrompt } = useEditor();
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [promptSections, setPromptSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchPrompts() {
      try {
        setLoading(true);
        setError(false);
        const data = await api.prompts.getAll();
        if (!cancelled) {
          const sections = mapApiSectionsToSections(data.sections);
          setPromptSections(sections);
          if (sections.length > 0) setActiveSection(sections[0].id);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPrompts();
    return () => { cancelled = true; };
  }, []);

  // Flatten all prompts for the active section, with optional search filter
  const visiblePrompts = useMemo(() => {
    const section = promptSections.find((s) => s.id === activeSection);
    if (!section) return [];

    const all = section.categories.flatMap((c) => c.prompts);

    if (!searchQuery.trim()) return all;

    const q = searchQuery.toLowerCase();
    return all.filter(
      (p) => p.prompt.toLowerCase().includes(q) || p.type.toLowerCase().includes(q),
    );
  }, [promptSections, activeSection, searchQuery]);

  function requireAuth(): boolean {
    if (user) return true;
    toast.error('Faça login para usar os prompts', {
      action: { label: 'Entrar', onClick: () => openLoginModal() },
    });
    return false;
  }

  async function handleCopy(prompt: string, id: string) {
    if (!requireAuth()) return;
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    toast.success('Prompt copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleOpenPanel(panelType: 'generate-image' | 'generate-video', prompt: string) {
    if (!requireAuth()) return;
    requestPanelWithPrompt({ panelType, prompt });
  }

  // Mount / unmount animation
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <aside
      className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col bg-[#171f21] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white/85">Prompts</span>
          {!loading && (
            <span className="text-[10px] font-bold text-[#a2dd00]/80 bg-[#a2dd00]/[0.08] px-2 py-0.5 rounded-full tabular-nums">
              {visiblePrompts.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
          <input
            type="text"
            placeholder="Buscar prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-white/[0.04] py-2 pl-8 pr-8 text-xs text-white/80 placeholder:text-white/20 ring-1 ring-white/[0.06] focus:outline-none focus:ring-[#a2dd00]/30 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-3 pb-2.5 overflow-x-auto sidebar-scroll">
        {promptSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${
                activeSection === section.id
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00] ring-1 ring-[#a2dd00]/25'
                  : 'text-white/30 hover:text-white/55 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="h-3 w-3" />
              {section.title}
            </button>
          );
        })}
      </div>

      <div className="h-px bg-white/[0.05]" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-5 w-5 animate-spin text-white/15" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <p className="text-xs text-white/30">Erro ao carregar prompts</p>
            <button
              onClick={() => window.location.reload()}
              className="text-[10px] text-[#a2dd00]/70 hover:text-[#a2dd00] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && visiblePrompts.length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-3">
            {visiblePrompts.map((promptItem) => (
              <PromptCard
                key={promptItem.id}
                item={promptItem}
                isCopied={copiedId === promptItem.id}
                onImage={() => handleOpenPanel('generate-image', promptItem.prompt)}
                onVideo={() => handleOpenPanel('generate-video', promptItem.prompt)}
                onCopy={() => handleCopy(promptItem.prompt, promptItem.id)}
              />
            ))}
          </div>
        )}

        {!loading && !error && visiblePrompts.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Search className="h-5 w-5 text-white/10" />
            <p className="text-xs text-white/25">Nenhum prompt encontrado</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-[#a2dd00]/60 hover:text-[#a2dd00] transition-colors"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
