'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminPromptSection, AdminPromptCategory, AdminPromptTemplate } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload as UploadIcon,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const TYPES = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'motion_control'];

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

  const { data: sections, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'prompts'],
    queryFn: () => api.admin.prompts.list(accessToken!),
    enabled: !!accessToken,
  });

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
    onSuccess: () => {
      toast.success('Seção salva');
      invalidate();
      setSectionForm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sectionDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteSection(accessToken!, id),
    onSuccess: () => {
      toast.success('Seção removida');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categorySave = useMutation({
    mutationFn: (f: CategoryForm) =>
      f.id
        ? api.admin.prompts.updateCategory(accessToken!, f.id, f)
        : api.admin.prompts.createCategory(accessToken!, f),
    onSuccess: () => {
      toast.success('Categoria salva');
      invalidate();
      setCategoryForm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categoryDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteCategory(accessToken!, id),
    onSuccess: () => {
      toast.success('Categoria removida');
      invalidate();
    },
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
    onSuccess: () => {
      toast.success('Prompt salvo');
      invalidate();
      setTemplateForm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templateDelete = useMutation({
    mutationFn: (id: string) => api.admin.prompts.deleteTemplate(accessToken!, id),
    onSuccess: () => {
      toast.success('Prompt removido');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const newSection = () =>
    setSectionForm({ slug: '', title: '', description: '', icon: '', sortOrder: 0 });
  const editSection = (s: AdminPromptSection) =>
    setSectionForm({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description ?? '',
      icon: s.icon ?? '',
      sortOrder: s.sortOrder,
    });

  const newCategory = (sectionId: string) =>
    setCategoryForm({ sectionId, title: '', sortOrder: 0 });
  const editCategory = (c: AdminPromptCategory) =>
    setCategoryForm({ id: c.id, sectionId: c.sectionId, title: c.title, sortOrder: c.sortOrder });

  const newTemplate = (categoryId: string) =>
    setTemplateForm({
      categoryId,
      title: '',
      type: 'text_to_image',
      prompt: '',
      imageUrl: '',
      aiModel: '',
      sortOrder: 0,
    });
  const editTemplate = (t: AdminPromptTemplate) =>
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

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Biblioteca de Prompts</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            Gerencie seções, categorias, prompts e imagens de preview.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={newSection}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#a2dd00] px-3 text-xs font-semibold text-[#111618] hover:bg-[#a2dd00]/90"
          >
            <Plus className="h-4 w-4" /> Nova seção
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sections?.length === 0 && (
            <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhuma seção cadastrada</p>
          )}
          {sections?.map((section) => {
            const isOpen = expanded[section.id] ?? true;
            return (
              <div key={section.id} className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    onClick={() => setExpanded({ ...expanded, [section.id]: !isOpen })}
                    className="text-[#f3f0ed]/50 hover:text-[#f3f0ed]"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#f3f0ed]">{section.title}</h3>
                      <span className="font-mono text-[10px] text-[#f3f0ed]/30">{section.slug}</span>
                      {!section.isActive && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-400">
                          inativa
                        </span>
                      )}
                    </div>
                    {section.description && (
                      <p className="mt-0.5 text-xs text-[#f3f0ed]/40">{section.description}</p>
                    )}
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
                  <div className="flex flex-col gap-2 border-t border-[#f3f0ed]/6 p-3">
                    {section.categories.length === 0 && (
                      <p className="py-4 text-center text-xs text-[#f3f0ed]/30">Sem categorias</p>
                    )}
                    {section.categories.map((category) => (
                      <div key={category.id} className="rounded-xl border border-[#f3f0ed]/6 bg-[#111618]/60">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <div className="flex-1">
                            <h4 className="text-[13px] font-medium text-[#f3f0ed]/90">{category.title}</h4>
                            <p className="text-[10px] text-[#f3f0ed]/30">
                              {category.prompts?.length ?? 0} prompts
                            </p>
                          </div>
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
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir categoria "${category.title}"?`))
                                categoryDelete.mutate(category.id);
                            }}
                            className="rounded-lg p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {category.prompts && category.prompts.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 border-t border-[#f3f0ed]/6 p-2 md:grid-cols-2 lg:grid-cols-3">
                            {category.prompts.map((t) => (
                              <div
                                key={t.id}
                                className="flex gap-2 rounded-lg border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-2"
                              >
                                {t.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={t.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                                ) : (
                                  <div className="h-14 w-14 shrink-0 rounded bg-[#f3f0ed]/5" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-[#f3f0ed]">{t.title}</p>
                                  <p className="truncate text-[10px] text-[#f3f0ed]/40">{t.type}</p>
                                  <p className="line-clamp-2 text-[10px] text-[#f3f0ed]/30">{t.prompt}</p>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => editTemplate(t)}
                                    className="rounded p-1 text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Excluir prompt "${t.title}"?`))
                                        templateDelete.mutate(t.id);
                                    }}
                                    className="rounded p-1 text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sectionForm && (
        <Modal onClose={() => setSectionForm(null)} title={sectionForm.id ? 'Editar seção' : 'Nova seção'}>
          <div className="flex flex-col gap-3">
            <Field label="Slug">
              <Input
                className={inputClass()}
                value={sectionForm.slug}
                onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })}
              />
            </Field>
            <Field label="Título">
              <Input
                className={inputClass()}
                value={sectionForm.title}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
              />
            </Field>
            <Field label="Descrição">
              <textarea
                className={`${inputClass()} h-20 py-2`}
                value={sectionForm.description}
                onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
              />
            </Field>
            <Field label="Ícone (lucide name)">
              <Input
                className={inputClass()}
                value={sectionForm.icon}
                onChange={(e) => setSectionForm({ ...sectionForm, icon: e.target.value })}
              />
            </Field>
            <Field label="Ordem">
              <Input
                type="number"
                className={inputClass()}
                value={sectionForm.sortOrder}
                onChange={(e) => setSectionForm({ ...sectionForm, sortOrder: Number(e.target.value) })}
              />
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
              <select
                className={inputClass()}
                value={categoryForm.sectionId}
                onChange={(e) => setCategoryForm({ ...categoryForm, sectionId: e.target.value })}
              >
                {sections?.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141a1c]">
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Título">
              <Input
                className={inputClass()}
                value={categoryForm.title}
                onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
              />
            </Field>
            <Field label="Ordem">
              <Input
                type="number"
                className={inputClass()}
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) })}
              />
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
              <select
                className={inputClass()}
                value={templateForm.categoryId}
                onChange={(e) => setTemplateForm({ ...templateForm, categoryId: e.target.value })}
              >
                {sections?.flatMap((s) =>
                  s.categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#141a1c]">
                      {s.title} › {c.title}
                    </option>
                  )),
                )}
              </select>
            </Field>
            <Field label="Título">
              <Input
                className={inputClass()}
                value={templateForm.title}
                onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
              />
            </Field>
            <Field label="Tipo">
              <select
                className={inputClass()}
                value={templateForm.type}
                onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#141a1c]">
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prompt">
              <textarea
                className={`${inputClass()} h-32 py-2`}
                value={templateForm.prompt}
                onChange={(e) => setTemplateForm({ ...templateForm, prompt: e.target.value })}
              />
            </Field>
            <Field label="Imagem de preview">
              <ImageUpload
                value={templateForm.imageUrl}
                onChange={(url) => setTemplateForm({ ...templateForm, imageUrl: url ?? '' })}
                accessToken={accessToken!}
              />
            </Field>
            <Field label="Modelo de IA (opcional)">
              <Input
                className={inputClass()}
                placeholder="ex: nano-banana-2"
                value={templateForm.aiModel}
                onChange={(e) => setTemplateForm({ ...templateForm, aiModel: e.target.value })}
              />
            </Field>
            <Field label="Ordem">
              <Input
                type="number"
                className={inputClass()}
                value={templateForm.sortOrder}
                onChange={(e) => setTemplateForm({ ...templateForm, sortOrder: Number(e.target.value) })}
              />
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
