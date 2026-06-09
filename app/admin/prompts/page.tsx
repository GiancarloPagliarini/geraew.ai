'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type {
  AdminPromptSectionLight,
  AdminPromptCategoryLight,
  AdminPromptTemplateItem,
} from '@/lib/api';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Upload as UploadIcon,
  X,
  Search,
  Settings2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FilterSelect, FilterField } from '@/components/admin/filter-controls';
import { toast } from 'sonner';

const TYPES = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'motion_control'];

const TYPE_LABELS: Record<string, string> = {
  text_to_image: 'Texto → Imagem',
  image_to_image: 'Imagem → Imagem',
  text_to_video: 'Texto → Vídeo',
  image_to_video: 'Imagem → Vídeo',
  motion_control: 'Copiar movimentos',
};

const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;

const PAGE_SIZE = 24;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">{label}</span>
      {children}
    </label>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#141a1c]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-5 py-3">
          <h3 className="text-sm font-semibold text-[#f3f0ed]">{title}</h3>
          <button onClick={onClose} className="text-[#f3f0ed]/40 hover:text-[#f3f0ed]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function inputClass() {
  return 'h-9 w-full rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus:border-[#a2dd00]/40 focus:outline-none';
}

function ImageUpload({
  value,
  onChange,
  accessToken,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  accessToken: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await api.admin.upload(accessToken, file.name, file.type, 'prompts');
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      onChange(publicUrl);
      toast.success('Imagem enviada');
    } catch (e) {
      toast.error((e as Error).message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#f3f0ed]/8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/30">
          <UploadIcon className="h-4 w-4" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/5 px-3 py-1.5 text-xs text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/10 disabled:opacity-40"
      >
        {uploading ? 'Enviando...' : value ? 'Trocar imagem' : 'Enviar imagem'}
      </button>
    </div>
  );
}

type SectionForm = { id?: string; slug: string; title: string; description: string; icon: string; sortOrder: number };
type CategoryForm = { id?: string; sectionId: string; title: string; sortOrder: number };
type TemplateForm = {
  id?: string;
  categoryId: string;
  title: string;
  type: string;
  prompt: string;
  imageUrl: string;
  aiModel: string;
  sortOrder: number;
};

export default function AdminPromptsPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  // ── Seções (leve) — para gerenciamento, filtros e selects dos modais ──
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['admin', 'prompts', 'sections-light'],
    queryFn: () => api.admin.prompts.sectionsLight(accessToken!),
    enabled: !!accessToken,
  });

  // ── Filtros ──
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      sectionId: sectionFilter !== 'all' ? sectionFilter : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    }),
    [search, typeFilter, sectionFilter, categoryFilter],
  );

  const { data: templatesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'prompts', 'templates', page, filters],
    queryFn: () => api.admin.prompts.templates(accessToken!, page, PAGE_SIZE, filters),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  });

  const templates = templatesData?.data ?? [];
  const total = templatesData?.meta?.total ?? 0;
  const totalPages = templatesData?.meta?.totalPages ?? 1;

  // Opções de categoria dependem da seção selecionada
  const categoryOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: 'all', label: 'Todas' }];
    if (!sections) return opts;
    const list =
      sectionFilter !== 'all'
        ? sections.filter((s) => s.id === sectionFilter)
        : sections;
    for (const s of list) {
      for (const c of s.categories) {
        opts.push({
          value: c.id,
          label: sectionFilter !== 'all' ? c.title : `${s.title} › ${c.title}`,
        });
      }
    }
    return opts;
  }, [sections, sectionFilter]);

  const hasFilters =
    search !== '' || typeFilter !== 'all' || sectionFilter !== 'all' || categoryFilter !== 'all';

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setTypeFilter('all');
    setSectionFilter('all');
    setCategoryFilter('all');
    setPage(1);
  }

  // ── Gerenciamento ──
  const [showManage, setShowManage] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sectionForm, setSectionForm] = useState<SectionForm | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'prompts'] });

  const sectionSave = useMutation({
    mutationFn: (f: SectionForm) =>
      f.id
        ? api.admin.prompts.updateSection(accessToken!, f.id, f)
        : api.admin.prompts.createSection(accessToken!, f),
    onSuccess: () => { toast.success('Seção salva'); invalidate(); setSectionForm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sectionDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteSection(accessToken!, id),
    onSuccess: () => { toast.success('Seção removida'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const categorySave = useMutation({
    mutationFn: (f: CategoryForm) =>
      f.id
        ? api.admin.prompts.updateCategory(accessToken!, f.id, f)
        : api.admin.prompts.createCategory(accessToken!, f),
    onSuccess: () => { toast.success('Categoria salva'); invalidate(); setCategoryForm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoryDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteCategory(accessToken!, id),
    onSuccess: () => { toast.success('Categoria removida'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateSave = useMutation({
    mutationFn: (f: TemplateForm) => {
      const payload = {
        categoryId: f.categoryId,
        title: f.title,
        type: f.type,
        prompt: f.prompt,
        imageUrl: f.imageUrl || undefined,
        aiModel: f.aiModel || undefined,
        sortOrder: f.sortOrder,
      };
      return f.id
        ? api.admin.prompts.updateTemplate(accessToken!, f.id, payload)
        : api.admin.prompts.createTemplate(accessToken!, payload);
    },
    onSuccess: () => { toast.success('Prompt salvo'); invalidate(); setTemplateForm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteTemplate(accessToken!, id),
    onSuccess: () => { toast.success('Prompt removido'); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const newSection = () => setSectionForm({ slug: '', title: '', description: '', icon: '', sortOrder: 0 });
  const editSection = (s: AdminPromptSectionLight) =>
    setSectionForm({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description ?? '',
      icon: s.icon ?? '',
      sortOrder: s.sortOrder,
    });

  const newCategory = (sectionId: string) => setCategoryForm({ sectionId, title: '', sortOrder: 0 });
  const editCategory = (c: AdminPromptCategoryLight) =>
    setCategoryForm({ id: c.id, sectionId: c.sectionId, title: c.title, sortOrder: c.sortOrder });

  const newTemplate = (categoryId: string) =>
    setTemplateForm({ categoryId, title: '', type: 'text_to_image', prompt: '', imageUrl: '', aiModel: '', sortOrder: 0 });
  const editTemplate = (t: AdminPromptTemplateItem) =>
    setTemplateForm({
      id: t.id,
      categoryId: t.categoryId,
      title: t.title,
      type: t.type,
      prompt: t.prompt,
      imageUrl: t.imageUrl ?? '',
      aiModel: t.aiModel ?? '',
      sortOrder: t.sortOrder,
    });

  const firstCategoryId = sections?.find((s) => s.categories.length > 0)?.categories[0]?.id;
  const defaultNewCategoryId = categoryFilter !== 'all' ? categoryFilter : firstCategoryId;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Biblioteca de Prompts</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            {total.toLocaleString('pt-BR')} {hasFilters ? 'prompt(s) no filtro' : 'prompts'} · gerencie
            seções, categorias e imagens.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowManage((v) => !v)}
            className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
              showManage
                ? 'border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]'
                : 'border-[#f3f0ed]/8 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5'
            }`}
          >
            <Settings2 className="h-4 w-4" /> Seções
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              if (!defaultNewCategoryId) {
                toast.error('Crie uma seção e uma categoria primeiro.');
                setShowManage(true);
                return;
              }
              newTemplate(defaultNewCategoryId);
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#a2dd00] px-3 text-xs font-semibold text-[#111618] hover:bg-[#a2dd00]/90"
          >
            <Plus className="h-4 w-4" /> Novo prompt
          </button>
        </div>
      </div>

      {/* Gerenciamento de seções/categorias (leve) */}
      {showManage && (
        <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2 p-3 md:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#f3f0ed]">Seções & categorias</h2>
            <button
              onClick={newSection}
              className="flex items-center gap-1.5 rounded-lg border border-[#f3f0ed]/8 px-2.5 py-1 text-xs text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/5"
            >
              <Plus className="h-3.5 w-3.5" /> Nova seção
            </button>
          </div>
          {sectionsLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#a2dd00]" />
            </div>
          ) : sections?.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#f3f0ed]/30">Nenhuma seção cadastrada</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sections?.map((section) => {
                const isOpen = expanded[section.id] ?? false;
                return (
                  <div key={section.id} className="rounded-xl border border-[#f3f0ed]/6 bg-[#111618]/40">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        onClick={() => setExpanded({ ...expanded, [section.id]: !isOpen })}
                        className="text-[#f3f0ed]/50 hover:text-[#f3f0ed]"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-semibold text-[#f3f0ed]">{section.title}</h3>
                          <span className="font-mono text-[10px] text-[#f3f0ed]/30">{section.slug}</span>
                          {!section.isActive && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">inativa</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => newCategory(section.id)}
                        className="rounded-lg border border-[#f3f0ed]/8 px-2 py-1 text-[11px] text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5"
                      >
                        + Categoria
                      </button>
                      <button
                        onClick={() => editSection(section)}
                        className="rounded-lg p-1.5 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir seção "${section.title}" e todas categorias/prompts?`))
                            sectionDelete.mutate(section.id);
                        }}
                        className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isOpen && (
                      <div className="flex flex-col gap-1.5 border-t border-[#f3f0ed]/6 p-2">
                        {section.categories.length === 0 && (
                          <p className="py-2 text-center text-xs text-[#f3f0ed]/30">Sem categorias</p>
                        )}
                        {section.categories.map((category) => (
                          <div key={category.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f3f0ed]/3">
                            <button
                              onClick={() => {
                                setSectionFilter(section.id);
                                setCategoryFilter(category.id);
                                setPage(1);
                              }}
                              className="flex-1 text-left transition-colors hover:text-[#a2dd00]"
                              title="Filtrar por esta categoria"
                            >
                              <span className="text-[13px] text-[#f3f0ed]/85">{category.title}</span>
                              <span className="ml-2 text-[10px] text-[#f3f0ed]/30">{category.promptCount} prompts</span>
                            </button>
                            <button
                              onClick={() => newTemplate(category.id)}
                              className="rounded-lg border border-[#f3f0ed]/8 px-2 py-1 text-[11px] text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5"
                            >
                              + Prompt
                            </button>
                            <button
                              onClick={() => editCategory(category)}
                              className="rounded-lg p-1.5 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir categoria "${category.title}"?`)) categoryDelete.mutate(category.id);
                              }}
                              className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-2xl border border-[#f3f0ed]/8 bg-gradient-to-b from-[#f3f0ed]/[0.04] to-[#f3f0ed]/[0.01] p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Buscar" className="min-w-[180px] flex-1 sm:max-w-[280px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Título ou conteúdo…"
                className="h-9 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] pl-9 pr-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 outline-none transition-colors focus:border-[#a2dd00]/50"
              />
            </div>
          </FilterField>

          <FilterField label="Tipo" className="min-w-[150px] flex-1">
            <FilterSelect
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[{ value: 'all', label: 'Todos' }, ...TYPES.map((t) => ({ value: t, label: typeLabel(t) }))]}
            />
          </FilterField>

          <FilterField label="Seção" className="min-w-[150px] flex-1">
            <FilterSelect
              value={sectionFilter}
              onChange={(v) => { setSectionFilter(v); setCategoryFilter('all'); setPage(1); }}
              options={[
                { value: 'all', label: 'Todas' },
                ...(sections ?? []).map((s) => ({ value: s.id, label: s.title })),
              ]}
            />
          </FilterField>

          <FilterField label="Categoria" className="min-w-[150px] flex-1">
            <FilterSelect
              value={categoryFilter}
              onChange={(v) => { setCategoryFilter(v); setPage(1); }}
              options={categoryOptions}
            />
          </FilterField>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Grade de prompts */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f3f0ed]/10 py-20 text-center">
          <p className="text-sm text-[#f3f0ed]/40">
            {hasFilters ? 'Nenhum prompt corresponde aos filtros.' : 'Nenhum prompt cadastrado.'}
          </p>
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs font-medium text-[#a2dd00]/80 hover:text-[#a2dd00]">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
              <div className="relative aspect-[4/3] bg-[#f3f0ed]/5">
                {t.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnailUrl || t.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#f3f0ed]/20">
                    <UploadIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <button
                    onClick={() => editTemplate(t)}
                    className="rounded-md bg-black/60 p-1.5 text-[#f3f0ed]/80 backdrop-blur hover:bg-black/80 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir prompt "${t.title}"?`)) templateDelete.mutate(t.id);
                    }}
                    className="rounded-md bg-black/60 p-1.5 text-red-300 backdrop-blur hover:bg-black/80 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-[#a2dd00] backdrop-blur">
                  {typeLabel(t.type)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2.5">
                <p className="truncate text-xs font-semibold text-[#f3f0ed]" title={t.title}>{t.title}</p>
                <p className="truncate text-[10px] text-[#f3f0ed]/40">
                  {t.category.section.title} › {t.category.title}
                </p>
                <p className="line-clamp-2 text-[10px] text-[#f3f0ed]/30">{t.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#f3f0ed]/30">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modais ── */}
      {sectionForm && (
        <Modal onClose={() => setSectionForm(null)} title={sectionForm.id ? 'Editar seção' : 'Nova seção'}>
          <div className="flex flex-col gap-3">
            <Field label="Slug">
              <Input className={inputClass()} value={sectionForm.slug} onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })} />
            </Field>
            <Field label="Título">
              <Input className={inputClass()} value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
            </Field>
            <Field label="Descrição">
              <textarea className={`${inputClass()} h-20 py-2`} value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} />
            </Field>
            <Field label="Ícone (lucide name)">
              <Input className={inputClass()} value={sectionForm.icon} onChange={(e) => setSectionForm({ ...sectionForm, icon: e.target.value })} />
            </Field>
            <Field label="Ordem">
              <Input type="number" className={inputClass()} value={sectionForm.sortOrder} onChange={(e) => setSectionForm({ ...sectionForm, sortOrder: Number(e.target.value) })} />
            </Field>
            <button
              onClick={() => sectionSave.mutate(sectionForm)}
              disabled={sectionSave.isPending || !sectionForm.slug || !sectionForm.title}
              className="mt-2 h-10 rounded-xl bg-[#a2dd00] text-sm font-semibold text-[#111618] hover:bg-[#a2dd00]/90 disabled:opacity-40"
            >
              {sectionSave.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {categoryForm && (
        <Modal onClose={() => setCategoryForm(null)} title={categoryForm.id ? 'Editar categoria' : 'Nova categoria'}>
          <div className="flex flex-col gap-3">
            <Field label="Seção">
              <select className={inputClass()} value={categoryForm.sectionId} onChange={(e) => setCategoryForm({ ...categoryForm, sectionId: e.target.value })}>
                {sections?.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141a1c]">{s.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Título">
              <Input className={inputClass()} value={categoryForm.title} onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })} />
            </Field>
            <Field label="Ordem">
              <Input type="number" className={inputClass()} value={categoryForm.sortOrder} onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })} />
            </Field>
            <button
              onClick={() => categorySave.mutate(categoryForm)}
              disabled={categorySave.isPending || !categoryForm.title}
              className="mt-2 h-10 rounded-xl bg-[#a2dd00] text-sm font-semibold text-[#111618] hover:bg-[#a2dd00]/90 disabled:opacity-40"
            >
              {categorySave.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}

      {templateForm && (
        <Modal onClose={() => setTemplateForm(null)} title={templateForm.id ? 'Editar prompt' : 'Novo prompt'}>
          <div className="flex flex-col gap-3">
            <Field label="Categoria">
              <select className={inputClass()} value={templateForm.categoryId} onChange={(e) => setTemplateForm({ ...templateForm, categoryId: e.target.value })}>
                {sections?.flatMap((s) =>
                  s.categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#141a1c]">{s.title} › {c.title}</option>
                  )),
                )}
              </select>
            </Field>
            <Field label="Título">
              <Input className={inputClass()} value={templateForm.title} onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <select className={inputClass()} value={templateForm.type} onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#141a1c]">{typeLabel(t)}</option>
                ))}
              </select>
            </Field>
            <Field label="Prompt">
              <textarea className={`${inputClass()} h-32 py-2`} value={templateForm.prompt} onChange={(e) => setTemplateForm({ ...templateForm, prompt: e.target.value })} />
            </Field>
            <Field label="Imagem de preview">
              <ImageUpload value={templateForm.imageUrl} onChange={(url) => setTemplateForm({ ...templateForm, imageUrl: url ?? '' })} accessToken={accessToken!} />
            </Field>
            <Field label="Modelo de IA (opcional)">
              <Input className={inputClass()} placeholder="ex: nano-banana-2" value={templateForm.aiModel} onChange={(e) => setTemplateForm({ ...templateForm, aiModel: e.target.value })} />
            </Field>
            <Field label="Ordem">
              <Input type="number" className={inputClass()} value={templateForm.sortOrder} onChange={(e) => setTemplateForm({ ...templateForm, sortOrder: Number(e.target.value) })} />
            </Field>
            <button
              onClick={() => templateSave.mutate(templateForm)}
              disabled={templateSave.isPending || !templateForm.title || !templateForm.prompt}
              className="mt-2 h-10 rounded-xl bg-[#a2dd00] text-sm font-semibold text-[#111618] hover:bg-[#a2dd00]/90 disabled:opacity-40"
            >
              {templateSave.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
