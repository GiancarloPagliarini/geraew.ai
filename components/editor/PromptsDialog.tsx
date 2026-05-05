'use client';

import {
  Copy, Check, X, ImageIcon, Search, Trash2, Plus,
  Camera, Sparkles, Dumbbell, Sun, ZoomIn, Mic, Moon, PersonStanding, Package, Target, Hand, Gem,
  Loader2, Lock,
  type LucideIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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

const PAGE_SIZE = 16;

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
        image: p.thumbnailUrl || p.imageUrl || undefined,
      })),
    })),
  }));
}

function PromptCard({ item, isCopied, isAdmin, onCopy, onDelete }: {
  item: Prompt;
  isCopied: boolean;
  isAdmin: boolean;
  onCopy: () => void;
  onDelete: () => void;
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

        {/* Top-right buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 backdrop-blur-md ring-1 ring-red-500 hover:opacity-80 text-red-200 active:scale-[0.95] transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/40 backdrop-blur-md text-white/50 ring-1 ring-white/[0.08] hover:bg-black/60 hover:text-white/80 active:scale-[0.95] transition-all"
          >
            {isCopied ? <Check className="h-3 w-3 text-[#a2dd00]" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>

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

// ── Delete Confirm Modal ──

function DeleteConfirmModal({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('editorDialogs.prompts.delete');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-2xl bg-[#1a2225] ring-1 ring-white/[0.08] p-5 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/85">{t('title')}</h3>
          <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-white/50">{t('description')}</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white/[0.04] py-2.5 text-xs font-bold text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.08] transition-all"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500/20 py-2.5 text-xs font-bold text-red-400 ring-1 ring-red-500/25 hover:bg-red-500/30 transition-all"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Prompt Modal ──

function AddPromptModal({ categoryId, accessToken, onClose, onAdded }: {
  categoryId: string;
  accessToken: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('json');
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const t = useTranslations('editorDialogs.prompts.addModal');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) {
      toast.error(t('validationError'));
      return;
    }
    setSaving(true);
    try {
      await api.prompts.createTemplate(accessToken, {
        categoryId,
        title: title.trim(),
        type,
        prompt: prompt.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });
      toast.success(t('success'));
      onAdded();
      onClose();
    } catch {
      toast.error(t('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md mx-4 rounded-2xl bg-[#1a2225] ring-1 ring-white/[0.08] p-5 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white/85">{t('title')}</h3>
          <button type="button" onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          type="text"
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 ring-1 ring-white/[0.06] focus:outline-none focus:ring-[#a2dd00]/30"
        />

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-full rounded-xl border border-white/6 bg-white/4 px-3 text-xs text-white/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-white/30 [&>svg]:text-white/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-70 rounded-xl border border-white/8 bg-[#1a2225] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
            <SelectItem value="json" className="cursor-pointer rounded-lg px-3 py-2 text-xs text-white/70 transition-all focus:bg-white/6 focus:text-white data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">
              JSON
            </SelectItem>
            <SelectItem value="text" className="cursor-pointer rounded-lg px-3 py-2 text-xs text-white/70 transition-all focus:bg-white/6 focus:text-white data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">
              Text
            </SelectItem>
          </SelectContent>
        </Select>

        <textarea
          placeholder={t('promptPlaceholder')}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 ring-1 ring-white/[0.06] focus:outline-none focus:ring-[#a2dd00]/30 resize-none"
        />

        <input
          type="text"
          placeholder={t('imageUrlPlaceholder')}
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 ring-1 ring-white/[0.06] focus:outline-none focus:ring-[#a2dd00]/30"
        />

        <button
          type="submit"
          disabled={saving}
          className="mt-1 w-full rounded-lg bg-[#a2dd00]/20 py-2.5 text-xs font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/25 hover:bg-[#a2dd00]/30 disabled:opacity-50 transition-all"
        >
          {saving ? t('saving') : t('submit')}
        </button>
      </form>
    </div>
  );
}

// ── Main Component ──

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptsDialog({ open, onOpenChange }: PromptsDialogProps) {
  const t = useTranslations('editorDialogs.prompts');
  const { requestPanelWithPrompt, studioMode } = useEditor();
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);

  const [promptSections, setPromptSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const fetchRef = useRef(0);
  const hasFetchedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  async function fetchPrompts() {
    if (!user || !accessToken) return;
    const id = ++fetchRef.current;
    try {
      setLoading(true);
      setError(false);
      const data = await api.prompts.getAll(accessToken);
      if (id === fetchRef.current) {
        const sections = mapApiSectionsToSections(data.sections);
        setPromptSections(sections);
        if (!activeSection && sections.length > 0) setActiveSection(sections[0].id);
        hasFetchedRef.current = true;
      }
    } catch {
      if (id === fetchRef.current) setError(true);
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }

  // Só busca prompts quando o diálogo estiver aberto e o usuário autenticado.
  // Reavaliar também quando a auth mudar — assim, após login, refaz o fetch.
  useEffect(() => {
    if (!open) return;
    if (!user || !accessToken) return;
    if (hasFetchedRef.current) return;
    fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, accessToken]);

  // Ao deslogar, limpa o cache para refetch no próximo login.
  useEffect(() => {
    if (!user) {
      hasFetchedRef.current = false;
      setPromptSections([]);
      setError(false);
    }
  }, [user]);

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

  const renderedPrompts = useMemo(
    () => visiblePrompts.slice(0, visibleCount),
    [visiblePrompts, visibleCount],
  );
  const hasMore = visibleCount < visiblePrompts.length;

  // Reset pagination + scroll on section/search change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeSection, searchQuery]);

  // IntersectionObserver — load next page when sentinel hits viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = scrollRef.current;
    if (!sentinel || !scroller || !hasMore) return;

    const loadMore = () =>
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, visiblePrompts.length));

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { root: scroller, threshold: 0, rootMargin: '300px' },
    );
    observer.observe(sentinel);

    // If sentinel is already in range on (re)attach, the observer won't fire
    // a new intersection event — trigger manually.
    const rect = sentinel.getBoundingClientRect();
    const rootRect = scroller.getBoundingClientRect();
    if (rect.top <= rootRect.bottom + 300) loadMore();

    return () => observer.disconnect();
  }, [hasMore, visiblePrompts.length]);

  // Get categoryId for the active section (for adding prompts)
  const activeCategoryId = useMemo(() => {
    const section = promptSections.find((s) => s.id === activeSection);
    return section?.categories[0]?.id || null;
  }, [promptSections, activeSection]);

  function requireAuth(): boolean {
    if (user) return true;
    toast.error(t('loginRequired'), {
      action: { label: t('signIn'), onClick: () => openLoginModal() },
    });
    return false;
  }

  async function handleCopy(prompt: string, id: string) {
    if (!requireAuth()) return;
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    toast.success(t('copied'));
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleDelete(promptId: string) {
    if (!accessToken) return;
    setDeletePromptId(promptId);
  }

  async function confirmDelete() {
    if (!accessToken || !deletePromptId) return;
    const id = deletePromptId;
    setDeletePromptId(null);
    try {
      await api.prompts.deleteTemplate(accessToken, id);
      toast.success(t('delete.success'));
      fetchPrompts();
    } catch {
      toast.error(t('delete.error'));
    }
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
    <>
      <aside
        className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col ${studioMode ? 'bg-[#0d1011]' : 'bg-[#171f21]'} text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold tracking-tight text-white/85">{t('title')}</span>
            {!loading && (
              <span className="text-[10px] font-bold text-[#a2dd00]/80 bg-[#a2dd00]/[0.08] px-2 py-0.5 rounded-full tabular-nums">
                {visiblePrompts.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && activeCategoryId && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex h-7 items-center gap-1 rounded-lg bg-[#a2dd00]/15 px-2 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/25 hover:bg-[#a2dd00]/25 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {t('add')}
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
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
                className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${activeSection === section.id
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00] ring-[#a2dd00]/25'
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
        <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto sidebar-scroll">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-white/15" />
                <span className="animate-pulse text-xs font-semibold text-white/50">
                  {t('loading')}
                </span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-2">
              <p className="text-xs text-white/30">{t('loadError')}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-[10px] text-[#a2dd00]/70 hover:text-[#a2dd00] transition-colors"
              >
                {t('tryAgain')}
              </button>
            </div>
          )}

          {!loading && !error && visiblePrompts.length > 0 && (
            <>
              <div className={`grid grid-cols-2 gap-2 p-3 ${!user ? 'blur-sm pointer-events-none select-none' : ''}`}>
                {renderedPrompts.map((promptItem) => (
                  <PromptCard
                    key={promptItem.id}
                    item={promptItem}
                    isCopied={copiedId === promptItem.id}
                    isAdmin={isAdmin}
                    onCopy={() => handleCopy(promptItem.prompt, promptItem.id)}
                    onDelete={() => handleDelete(promptItem.id)}
                  />
                ))}
              </div>
              {hasMore && <div ref={sentinelRef} className="h-4" />}
            </>
          )}

          {!loading && !error && visiblePrompts.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="h-5 w-5 text-white/10" />
              <p className="text-xs text-white/25">{t('noneFound')}</p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-[#a2dd00]/60 hover:text-[#a2dd00] transition-colors"
              >
                {t('clearSearch')}
              </button>
            </div>
          )}

        </div>

        {/* Auth overlay */}
        {!user && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#171f21]/70 backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
              <Lock className="h-6 w-6 text-[#a2dd00]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white/80">{t('loginTitle')}</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                {t('loginDescription')}
              </p>
            </div>
            <button
              onClick={() => openLoginModal()}
              className="rounded-xl bg-[#a2dd00] px-5 py-2 text-xs font-black text-black hover:bg-[#b8f000] transition-colors"
            >
              {t('signIn')}
            </button>
          </div>
        )}
        </div>
      </aside>

      {/* Delete confirm modal */}
      {deletePromptId && (
        <DeleteConfirmModal
          onClose={() => setDeletePromptId(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* Add prompt modal */}
      {showAddModal && activeCategoryId && accessToken && (
        <AddPromptModal
          categoryId={activeCategoryId}
          accessToken={accessToken}
          onClose={() => setShowAddModal(false)}
          onAdded={() => fetchPrompts()}
        />
      )}
    </>
  );
}
