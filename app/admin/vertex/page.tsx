'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Cloud,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import type { CreateVertexCredentialInput, VertexCredential } from '@/lib/api';

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminVertexPage() {
  const { accessToken } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [toDelete, setToDelete] = useState<VertexCredential | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data: credentials, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['admin', 'vertex', 'credentials'],
    queryFn: () => api.adminVertex.listCredentials(accessToken!),
    enabled: !!accessToken,
  });

  const activeCount = credentials?.filter((c) => c.active).length ?? 0;
  const inactiveCount = (credentials?.length ?? 0) - activeCount;
  const filtered = (credentials ?? []).filter((c) =>
    filter === 'all' ? true : filter === 'active' ? c.active : !c.active,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#f3f0ed]">
            <Cloud className="h-6 w-6 text-[#a2dd00]" />
            Vertex
          </h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/50">
            Gerenciamento das contas Vertex (GCP) usadas pelo Geraew Provider para gerar vídeos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-2 rounded-lg border border-[#f3f0ed]/10 bg-[#1a2123] px-3 text-sm text-[#f3f0ed]/70 transition hover:bg-[#212a2c] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[#a2dd00] px-3 text-sm font-semibold text-[#111618] transition hover:bg-[#b4f000]"
          >
            <Plus className="h-4 w-4" />
            Adicionar conta
          </button>
        </div>
      </div>

      {/* Summary */}
      {credentials && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryCard label="Total de contas" value={credentials.length} />
          <SummaryCard label="Ativas" value={activeCount} accent={activeCount > 0 ? 'green' : undefined} />
          <SummaryCard label="Inativas" value={credentials.length - activeCount} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300/90">
            {error instanceof ApiError ? error.message : 'Erro ao carregar as contas.'}
          </p>
        </div>
      )}

      {/* Filtro */}
      {credentials && credentials.length > 0 && (
        <div className="flex items-center gap-1 rounded-lg border border-[#f3f0ed]/10 bg-[#1a2123] p-1 w-fit">
          <FilterTab label="Todas" count={credentials.length} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterTab label="Ativas" count={activeCount} active={filter === 'active'} onClick={() => setFilter('active')} />
          <FilterTab label="Inativas" count={inactiveCount} active={filter === 'inactive'} onClick={() => setFilter('inactive')} />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-[#f3f0ed]/10 bg-[#1a2123]">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && credentials && credentials.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#f3f0ed]/15 bg-[#1a2123] p-12 text-center">
          <Cloud className="mx-auto h-8 w-8 text-[#f3f0ed]/30" />
          <p className="mt-3 text-sm text-[#f3f0ed]/60">
            Nenhuma conta Vertex configurada ainda.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#a2dd00] px-3 text-sm font-semibold text-[#111618] transition hover:bg-[#b4f000]"
          >
            <Plus className="h-4 w-4" />
            Adicionar primeira conta
          </button>
        </div>
      )}

      {/* Filtro sem resultados */}
      {!isLoading && credentials && credentials.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#f3f0ed]/15 bg-[#1a2123] p-10 text-center">
          <p className="text-sm text-[#f3f0ed]/50">
            Nenhuma conta {filter === 'active' ? 'ativa' : 'inativa'} no momento.
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((cred) => (
            <CredentialCard key={cred.id} cred={cred} onDelete={() => setToDelete(cred)} />
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {toDelete && <DeleteModal cred={toDelete} onClose={() => setToDelete(null)} />}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: 'green';
}) {
  const accentClass = accent === 'green' ? 'text-[#a2dd00]' : 'text-[#f3f0ed]';
  return (
    <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#1a2123] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#f3f0ed]/40">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
          : 'text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80'
      }`}
    >
      {label}
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
          active ? 'bg-[#a2dd00]/20' : 'bg-[#f3f0ed]/10 text-[#f3f0ed]/40'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CredentialCard({ cred, onDelete }: { cred: VertexCredential; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#1a2123] p-5 transition hover:border-[#f3f0ed]/12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#a2dd00]" />
            <h3 className="truncate text-sm font-semibold text-[#f3f0ed]">{cred.name}</h3>
            <StatusBadge active={cred.active} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#f3f0ed]/60">
            <span className="text-[#f3f0ed]/40">Quota Project:</span>
            <span className="rounded bg-[#0e1416] px-1.5 py-0.5 font-mono text-[11px] text-[#f3f0ed]/70">
              {cred.quotaProjectId}
            </span>
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#f3f0ed]/40">
            <span>ID: <span className="font-mono">{cred.id}</span></span>
            <span>·</span>
            <span>Criada em {formatDate(cred.createdAt)}</span>
          </p>
        </div>

        <button
          onClick={onDelete}
          title="Excluir conta"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-500/20 px-3 text-xs text-red-400 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Ativa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f0ed]/10 px-2.5 py-1 text-[11px] font-medium text-[#f3f0ed]/50">
      <span className="h-1.5 w-1.5 rounded-full bg-[#f3f0ed]/40" />
      Inativa
    </span>
  );
}

// ─── Modal de criação ───────────────────────────────────────────

const EMPTY_FORM: CreateVertexCredentialInput = {
  name: '',
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  quotaProjectId: '',
};

function CreateModal({ onClose }: { onClose: () => void }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateVertexCredentialInput>(EMPTY_FORM);

  const mutation = useMutation({
    mutationFn: () => api.adminVertex.createCredential(accessToken!, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vertex', 'credentials'] });
      onClose();
    },
  });

  const canSubmit =
    form.name.trim() &&
    form.clientId.trim() &&
    form.clientSecret.trim() &&
    form.refreshToken.trim() &&
    form.quotaProjectId.trim() &&
    !mutation.isPending;

  const set = (key: keyof CreateVertexCredentialInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-[#f3f0ed]/10 bg-[#141a1c] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#f3f0ed]/6 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]">
              <Plus className="h-4 w-4 text-[#a2dd00]" />
              Adicionar conta Vertex
            </h2>
            <p className="mt-1 text-xs text-[#f3f0ed]/50">
              As credenciais OAuth são enviadas direto ao Geraew Provider.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/60 transition hover:bg-[#1a2123] hover:text-[#f3f0ed]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Field label="Nome" placeholder="account1" value={form.name} onChange={set('name')} />
          <Field label="Client ID" placeholder="xxxxx.apps.googleusercontent.com" value={form.clientId} onChange={set('clientId')} mono />
          <Field label="Client Secret" placeholder="GOCSPX-..." value={form.clientSecret} onChange={set('clientSecret')} mono secret />
          <Field label="Refresh Token" placeholder="1//0g..." value={form.refreshToken} onChange={set('refreshToken')} mono secret />
          <Field label="Quota Project ID" placeholder="project-3466d30f-..." value={form.quotaProjectId} onChange={set('quotaProjectId')} mono />

          {mutation.error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300/90">
                {mutation.error instanceof ApiError ? mutation.error.message : 'Erro ao adicionar conta.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#f3f0ed]/6 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#f3f0ed]/10 px-4 py-2 text-sm text-[#f3f0ed]/70 transition hover:bg-[#1a2123]"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-[#111618] transition hover:bg-[#b4f000] disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  secret,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  mono?: boolean;
  secret?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[#f3f0ed]/40">
        {label}
      </label>
      <input
        type={secret ? 'password' : 'text'}
        autoComplete="off"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[#f3f0ed]/10 bg-[#0e1416] px-3 py-2 text-sm text-[#f3f0ed] outline-none transition placeholder:text-[#f3f0ed]/25 focus:border-[#a2dd00]/50 ${mono ? 'font-mono text-[13px]' : ''}`}
      />
    </div>
  );
}

// ─── Modal de exclusão ──────────────────────────────────────────

function DeleteModal({ cred, onClose }: { cred: VertexCredential; onClose: () => void }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.adminVertex.deleteCredential(accessToken!, cred.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'vertex', 'credentials'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-red-500/20 bg-[#141a1c] shadow-2xl">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-[#f3f0ed]">Tem certeza?</h2>
          </div>
          <p className="mt-3 text-sm text-[#f3f0ed]/70">
            Você está prestes a excluir a conta Vertex{' '}
            <span className="font-semibold text-[#f3f0ed]">{cred.name}</span>. Essa ação é{' '}
            <span className="font-semibold text-red-400">permanente</span> e o Geraew Provider deixará
            de usar essa conta para gerar vídeos.
          </p>

          {mutation.error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300/90">
                {mutation.error instanceof ApiError ? mutation.error.message : 'Erro ao excluir conta.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#f3f0ed]/6 px-6 py-4">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="rounded-lg border border-[#f3f0ed]/10 px-4 py-2 text-sm text-[#f3f0ed]/70 transition hover:bg-[#1a2123] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir conta
          </button>
        </div>
      </div>
    </div>
  );
}
