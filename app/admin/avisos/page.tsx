'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Eye,
  ImagePlus,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { AnnouncementModal } from '@/components/editor/AnnouncementModal';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type {
  Announcement,
  AnnouncementAction,
  AnnouncementVariant,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const VARIANT_LABEL: Record<AnnouncementVariant, string> = {
  feature: 'Feature',
  maintenance: 'Manutenção',
  promo: 'Promo',
  openai: 'OpenAI',
  gift: 'Presente',
};

const ACTION_LABEL: Record<AnnouncementAction['type'], string> = {
  'open-image-panel': 'Abrir painel de imagem',
  'open-video-panel': 'Abrir painel de vídeo',
  'open-weekly-claim': 'Abrir resgate semanal',
  href: 'Link externo',
};

type ActionType = AnnouncementAction['type'] | 'none';

interface FormState {
  slug: string;
  variant: AnnouncementVariant | '';
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  actionType: ActionType;
  hrefUrl: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: FormState = {
  slug: '',
  variant: '',
  badge: '',
  title: '',
  description: '',
  imageUrl: '',
  ctaLabel: '',
  actionType: 'none',
  hrefUrl: '',
  isActive: true,
  sortOrder: 0,
};

function announcementToForm(a: Announcement): FormState {
  return {
    slug: a.slug,
    variant: (a.variant as AnnouncementVariant) ?? '',
    badge: a.badge ?? '',
    title: a.title,
    description: a.description,
    imageUrl: a.imageUrl ?? '',
    ctaLabel: a.ctaLabel ?? '',
    actionType: a.ctaAction?.type ?? 'none',
    hrefUrl: a.ctaAction?.type === 'href' ? a.ctaAction.url : '',
    isActive: a.isActive,
    sortOrder: a.sortOrder,
  };
}

function formToCreatePayload(f: FormState): CreateAnnouncementInput {
  return {
    slug: f.slug.trim(),
    variant: f.variant || undefined,
    badge: f.badge.trim() || undefined,
    title: f.title.trim(),
    description: f.description.trim(),
    imageUrl: f.imageUrl.trim() || undefined,
    ctaLabel: f.ctaLabel.trim() || undefined,
    ctaAction: actionFromForm(f),
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  };
}

function formToUpdatePayload(f: FormState): UpdateAnnouncementInput {
  return {
    variant: f.variant || undefined,
    badge: f.badge.trim() || undefined,
    title: f.title.trim(),
    description: f.description.trim(),
    imageUrl: f.imageUrl.trim() || undefined,
    ctaLabel: f.ctaLabel.trim() || undefined,
    ctaAction: actionFromForm(f),
    isActive: f.isActive,
    sortOrder: f.sortOrder,
  };
}

function actionFromForm(f: FormState): AnnouncementAction | undefined {
  switch (f.actionType) {
    case 'none':
      return undefined;
    case 'href':
      return { type: 'href', url: f.hrefUrl.trim() };
    default:
      return { type: f.actionType };
  }
}

function buildPreviewAnnouncement(f: FormState): Announcement {
  const now = new Date().toISOString();
  return {
    id: 'preview',
    slug: f.slug || 'preview',
    variant: (f.variant || null) as Announcement['variant'],
    badge: f.badge.trim() || null,
    title: f.title.trim() || 'Título do aviso',
    description: f.description.trim() || 'Descrição do aviso aparece aqui.',
    imageUrl: f.imageUrl.trim() || null,
    ctaLabel: f.ctaLabel.trim() || null,
    ctaAction: actionFromForm(f) ?? null,
    isActive: f.isActive,
    sortOrder: f.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function variantBadge(variant: string | null) {
  if (!variant) return <span className="text-xs text-[#f3f0ed]/30">—</span>;
  const colors: Record<string, string> = {
    feature: 'border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]',
    maintenance: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    promo: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    openai: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
    gift: 'border-pink-500/30 bg-pink-500/10 text-pink-400',
  };
  return (
    <Badge variant="outline" className={colors[variant] ?? 'border-[#f3f0ed]/10 text-[#f3f0ed]/50'}>
      {VARIANT_LABEL[variant as AnnouncementVariant] ?? variant}
    </Badge>
  );
}

export default function AdminAnnouncementsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [editorState, setEditorState] = useState<{ mode: 'create' | 'edit'; id: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [previewItem, setPreviewItem] = useState<Announcement | null>(null);

  const { data: announcements, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'announcements'],
    queryFn: () => api.admin.announcements.list(accessToken!),
    enabled: !!accessToken,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.admin.announcements.toggle(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao alternar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.announcements.delete(accessToken!, id),
    onSuccess: () => {
      toast.success('Aviso removido');
      queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      setConfirmDelete(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao remover'),
  });

  const editing = editorState?.mode === 'edit'
    ? announcements?.find((a) => a.id === editorState.id) ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a2dd00]/15">
            <Megaphone className="h-5 w-5 text-[#a2dd00]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f3f0ed]">Avisos</h1>
            <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
              Pop-ups exibidos no workspace dos usuários · {announcements?.length ?? 0} aviso(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setEditorState({ mode: 'create', id: null })}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-[#a2dd00] px-4 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo aviso
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Título / Slug</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Variant</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">CTA</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ordem</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(announcements ?? []).map((a) => (
                <TableRow key={a.id} className="border-[#f3f0ed]/4">
                  <TableCell>
                    <button
                      onClick={() => toggleMutation.mutate(a.id)}
                      disabled={toggleMutation.isPending}
                      role="switch"
                      aria-checked={a.isActive}
                      className={`relative h-5 w-9 rounded-full transition-colors ${a.isActive ? 'bg-[#a2dd00]' : 'bg-[#f3f0ed]/10'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[#1a2123] transition-transform ${a.isActive ? 'translate-x-4' : ''}`}
                      />
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[#f3f0ed]">{a.title}</span>
                      <span className="font-mono text-[10px] text-[#f3f0ed]/40">{a.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>{variantBadge(a.variant)}</TableCell>
                  <TableCell>
                    {a.ctaAction ? (
                      <span className="text-[11px] text-[#f3f0ed]/50">
                        {ACTION_LABEL[a.ctaAction.type]}
                        {a.ctaAction.type === 'href' && a.ctaAction.url ? ` → ${a.ctaAction.url}` : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-[#f3f0ed]/30">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs tabular-nums text-[#f3f0ed]/50">{a.sortOrder}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setPreviewItem(a)}
                        title="Visualizar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditorState({ mode: 'edit', id: a.id })}
                        title="Editar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: a.id, title: a.title })}
                        title="Remover"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(announcements?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-[#f3f0ed]/30">
                    Nenhum aviso cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {editorState && (
        <AnnouncementEditor
          mode={editorState.mode}
          announcement={editing}
          accessToken={accessToken!}
          onClose={() => setEditorState(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'announcements'] });
            queryClient.invalidateQueries({ queryKey: ['announcements', 'active'] });
            setEditorState(null);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          title={confirmDelete.title}
          isPending={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
        />
      )}

      {previewItem && (
        <AnnouncementModal
          announcement={previewItem}
          open={true}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  title,
  isPending,
  onCancel,
  onConfirm,
}: {
  title: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel();
      if (e.key === 'Enter' && !isPending) onConfirm();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm, isPending]);

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isPending) onCancel(); }}
    >
      <div className="relative mx-4 flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#15191b] p-6 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 ring-1 ring-rose-500/20">
            <Trash2 className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-[#f3f0ed]">Remover aviso?</h3>
            <p className="text-xs leading-relaxed text-[#f3f0ed]/55">
              <span className="font-semibold text-[#f3f0ed]/80">&quot;{title}&quot;</span> será removido
              permanentemente. Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed] disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Sim, remover
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── Editor dialog ─────────

interface EditorProps {
  mode: 'create' | 'edit';
  announcement: Announcement | null;
  accessToken: string;
  onClose: () => void;
  onSaved: () => void;
}

function AnnouncementEditor({ mode, announcement, accessToken, onClose, onSaved }: EditorProps) {
  const [form, setForm] = useState<FormState>(
    announcement ? announcementToForm(announcement) : EMPTY_FORM,
  );
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'create') {
        return api.admin.announcements.create(accessToken, formToCreatePayload(form));
      }
      return api.admin.announcements.update(accessToken, announcement!.id, formToUpdatePayload(form));
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Aviso criado' : 'Aviso atualizado');
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || 'Erro ao salvar'),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#0e1213] px-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 transition-colors focus:border-[#a2dd00]/50 focus:outline-none focus:ring-2 focus:ring-[#a2dd00]/15';

  return (
    <>
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md ${previewOpen ? 'hidden' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#15191b] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.06] bg-gradient-to-b from-[#1a2123] to-[#15191b] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a2dd00]/15 ring-1 ring-[#a2dd00]/20">
              <Megaphone className="h-4 w-4 text-[#a2dd00]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f3f0ed]">
                {mode === 'create' ? 'Novo aviso' : 'Editar aviso'}
              </h2>
              <p className="text-[11px] text-[#f3f0ed]/40">
                {mode === 'create'
                  ? 'Configure como o pop-up vai aparecer pros usuários'
                  : `Editando: ${form.slug}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="sidebar-scroll flex flex-col gap-6 overflow-y-auto px-6 py-6">

          {/* ── Identificação ── */}
          <Section title="Identificação" subtitle="Como o aviso é referenciado internamente.">
            <Field label="Slug" required hint="Identificador único e permanente. Não editável após criar (preserva quem já viu).">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#f3f0ed]/30">@</span>
                <input
                  value={form.slug}
                  onChange={(e) => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="novo-modelo-2026-04"
                  disabled={mode === 'edit'}
                  className={`${inputClass} pl-7 font-mono ${mode === 'edit' ? 'cursor-not-allowed opacity-60' : ''}`}
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Variant" hint="Define o ícone e cor do aviso.">
                <select
                  value={form.variant}
                  onChange={(e) => update('variant', e.target.value as FormState['variant'])}
                  className={inputClass}
                >
                  <option value="">— Padrão —</option>
                  <option value="feature">Feature</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="promo">Promo</option>
                  <option value="openai">OpenAI</option>
                  <option value="gift">Presente</option>
                </select>
              </Field>
              <Field label="Ordem" hint="Menor número = aparece primeiro.">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => update('sortOrder', Number(e.target.value) || 0)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* ── Conteúdo ── */}
          <Section title="Conteúdo" subtitle="O que o usuário vai ler no pop-up.">
            <Field label="Badge" hint="Etiqueta pequena no topo do modal.">
              <div className="flex items-center gap-3">
                <input
                  value={form.badge}
                  onChange={(e) => update('badge', e.target.value.toUpperCase())}
                  placeholder="NOVO MODELO"
                  className={`${inputClass} flex-1 uppercase tracking-wider`}
                  maxLength={40}
                />
                {form.badge && (
                  <span className="shrink-0 rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]">
                    {form.badge}
                  </span>
                )}
              </div>
            </Field>

            <Field label="Título" required>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Título principal do aviso"
                className={inputClass}
                maxLength={160}
              />
            </Field>

            <Field
              label="Descrição"
              required
              meta={`${form.description.length}/600`}
            >
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Texto explicativo do aviso. Pode usar 2-3 frases."
                rows={4}
                maxLength={600}
                className="w-full resize-none rounded-lg border border-[#f3f0ed]/10 bg-[#0e1213] px-3 py-2.5 text-sm leading-relaxed text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 transition-colors focus:border-[#a2dd00]/50 focus:outline-none focus:ring-2 focus:ring-[#a2dd00]/15"
              />
            </Field>
          </Section>

          {/* ── Mídia ── */}
          <Section title="Mídia" subtitle="Imagem ilustrativa (opcional).">
            <ImageField
              value={form.imageUrl}
              onChange={(url) => update('imageUrl', url ?? '')}
              accessToken={accessToken}
              inputClass={inputClass}
            />
          </Section>

          {/* ── CTA ── */}
          <Section title="Botão de ação" subtitle="O que acontece quando o usuário clica.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Texto do botão">
                <input
                  value={form.ctaLabel}
                  onChange={(e) => update('ctaLabel', e.target.value)}
                  placeholder='ex: "Quero testar"'
                  className={inputClass}
                  maxLength={40}
                />
              </Field>
              <Field label="Ação ao clicar">
                <select
                  value={form.actionType}
                  onChange={(e) => update('actionType', e.target.value as ActionType)}
                  className={inputClass}
                >
                  <option value="none">Nenhuma (apenas fechar)</option>
                  <option value="open-image-panel">Abrir painel de imagem</option>
                  <option value="open-video-panel">Abrir painel de vídeo</option>
                  <option value="open-weekly-claim">Abrir resgate semanal</option>
                  <option value="href">Link externo</option>
                </select>
              </Field>
            </div>

            {form.actionType === 'href' && (
              <Field label="URL externa" required>
                <input
                  type="url"
                  value={form.hrefUrl}
                  onChange={(e) => update('hrefUrl', e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            )}
          </Section>

          {/* ── Status ── */}
          <Section title="Status">
            <button
              type="button"
              onClick={() => update('isActive', !form.isActive)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all ${form.isActive
                ? 'border-[#a2dd00]/30 bg-[#a2dd00]/[0.06]'
                : 'border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.02]'
                }`}
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-bold text-[#f3f0ed]">
                  {form.isActive ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-[11px] text-[#f3f0ed]/45">
                  {form.isActive
                    ? 'Aparece para usuários que ainda não viram'
                    : 'Não aparece para nenhum usuário'}
                </span>
              </div>
              <div className={`relative h-5 w-9 rounded-full transition-colors ${form.isActive ? 'bg-[#a2dd00]' : 'bg-[#f3f0ed]/15'}`}>
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-[#0e1213] transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
              </div>
            </button>
          </Section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#f3f0ed]/[0.06] bg-[#0e1213]/40 px-6 py-4">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!form.title.trim() || !form.description.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-xs font-semibold text-[#f3f0ed]/70 transition-all hover:border-[#a2dd00]/40 hover:bg-[#a2dd00]/[0.06] hover:text-[#f3f0ed] disabled:cursor-not-allowed disabled:opacity-40"
            title={
              !form.title.trim() || !form.description.trim()
                ? 'Preencha título e descrição para visualizar'
                : 'Visualizar como aparecerá para os usuários'
            }
          >
            <Eye className="h-3.5 w-3.5" />
            Visualizar
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]"
            >
              Cancelar
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-[#a2dd00] px-5 py-2 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'create' ? 'Criar aviso' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {previewOpen && (
      <AnnouncementModal
        announcement={buildPreviewAnnouncement(form)}
        open={true}
        onClose={() => setPreviewOpen(false)}
      />
    )}
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b border-[#f3f0ed]/[0.05] pb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f3f0ed]/55">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-[#f3f0ed]/30">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  meta,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[11px] font-bold text-[#f3f0ed]">
          {label}
          {required && <span className="ml-1 text-rose-400">*</span>}
        </label>
        {meta && <span className="font-mono text-[10px] tabular-nums text-[#f3f0ed]/30">{meta}</span>}
      </div>
      {children}
      {hint && <span className="text-[10px] leading-relaxed text-[#f3f0ed]/40">{hint}</span>}
    </div>
  );
}

function ImageField({
  value,
  onChange,
  accessToken,
  inputClass,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  accessToken: string;
  inputClass: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await api.admin.upload(accessToken, file.name, file.type, 'announcements');
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
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-[#f3f0ed]/10 bg-[#0e1213]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="h-44 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#f3f0ed] backdrop-blur-md transition-colors hover:bg-[#f3f0ed]/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200 backdrop-blur-md transition-colors hover:bg-rose-500/30"
            >
              <Trash2 className="h-3 w-3" />
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="group flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#f3f0ed]/10 bg-[#0e1213] transition-all hover:border-[#a2dd00]/40 hover:bg-[#a2dd00]/[0.03] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
          ) : (
            <ImagePlus className="h-5 w-5 text-[#f3f0ed]/30 transition-colors group-hover:text-[#a2dd00]" />
          )}
          <span className="text-xs font-semibold text-[#f3f0ed]/50 transition-colors group-hover:text-[#f3f0ed]">
            {uploading ? 'Enviando...' : 'Clique para enviar uma imagem'}
          </span>
          <span className="text-[10px] text-[#f3f0ed]/30">PNG, JPG, WEBP — até 10MB</span>
        </button>
      )}
      <input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder="ou cole uma URL externa"
        className={inputClass}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
