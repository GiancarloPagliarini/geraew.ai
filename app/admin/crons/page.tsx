'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  TimerReset,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminCronExecutionItem, AdminCronSummary } from '@/lib/api';

const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  SUCCESS: { label: 'Sucesso', bg: 'bg-emerald-500/15', text: 'text-emerald-400', Icon: CheckCircle2 },
  ERROR: { label: 'Erro', bg: 'bg-red-500/15', text: 'text-red-400', Icon: AlertCircle },
  RUNNING: { label: 'Executando', bg: 'bg-amber-500/15', text: 'text-amber-400', Icon: Loader2 },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.SUCCESS;
  const Icon = style.Icon;
  const animate = status === 'RUNNING' ? 'animate-spin' : '';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} px-2.5 py-1 text-[11px] font-medium ${style.text}`}>
      <Icon className={`h-3 w-3 ${animate}`} />
      {style.label}
    </span>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = new Date(iso).getTime() - Date.now();
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  if (abs < 60_000) return future ? 'em <1min' : 'há <1min';
  const mins = Math.floor(abs / 60_000);
  if (mins < 60) return future ? `em ${mins}min` : `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return future ? `em ${hours}h` : `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return future ? `em ${days}d` : `há ${days}d`;
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

function shortCronName(name: string): string {
  // SubscriptionRenewalService.handleSubscriptionRenewal → handleSubscriptionRenewal
  const parts = name.split('.');
  return parts[parts.length - 1] || name;
}

function cronGroupName(name: string): string {
  // SubscriptionRenewalService.handleSubscriptionRenewal → SubscriptionRenewalService
  const parts = name.split('.');
  return parts.length > 1 ? parts[0] : 'Outros';
}

export default function AdminCronsPage() {
  const { accessToken } = useAuth();
  const [selectedCron, setSelectedCron] = useState<string | null>(null);

  const { data: crons, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'crons'],
    queryFn: () => api.adminCrons.list(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000, // refresh a cada 30s pra mostrar próxima execução atualizada
  });

  const summary = useMemo(() => {
    if (!crons) return null;
    return {
      total: crons.length,
      withErrors: crons.filter((c) => c.errorCount > 0).length,
      running: crons.filter((c) => c.runningCount > 0).length,
      lastErrorCron: crons.find((c) => c.lastExecution?.status === 'ERROR')?.cronName ?? null,
    };
  }, [crons]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#f3f0ed]">
            <Clock className="h-6 w-6 text-[#a2dd00]" />
            Cron Jobs
          </h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/50">
            Monitoramento de todos os jobs agendados — última execução, próxima rodada, erros e duração.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 items-center gap-2 rounded-lg border border-[#f3f0ed]/10 bg-[#1a2123] px-3 text-sm text-[#f3f0ed]/70 transition hover:bg-[#212a2c] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Total de crons" value={summary.total} />
          <SummaryCard label="Executando agora" value={summary.running} accent={summary.running > 0 ? 'amber' : undefined} />
          <SummaryCard label="Com erros (histórico)" value={summary.withErrors} accent={summary.withErrors > 0 ? 'red' : undefined} />
          <SummaryCard
            label="Último erro em"
            value={summary.lastErrorCron ? shortCronName(summary.lastErrorCron) : '—'}
            small
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-[#f3f0ed]/10 bg-[#1a2123]">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && crons && crons.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#f3f0ed]/15 bg-[#1a2123] p-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-[#f3f0ed]/30" />
          <p className="mt-3 text-sm text-[#f3f0ed]/60">
            Nenhuma execução registrada ainda. Os crons aparecem aqui após a primeira rodada.
          </p>
        </div>
      )}

      {/* Crons list */}
      {!isLoading && crons && crons.length > 0 && (
        <div className="space-y-3">
          {crons.map((cron) => (
            <CronCard key={cron.cronName} cron={cron} onOpen={() => setSelectedCron(cron.cronName)} />
          ))}
        </div>
      )}

      {/* Drawer de execuções */}
      {selectedCron && (
        <ExecutionsDrawer cronName={selectedCron} onClose={() => setSelectedCron(null)} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: number | string;
  accent?: 'amber' | 'red';
  small?: boolean;
}) {
  const accentClass =
    accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-red-400' : 'text-[#f3f0ed]';
  return (
    <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#1a2123] p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#f3f0ed]/40">{label}</p>
      <p className={`mt-2 font-bold ${accentClass} ${small ? 'text-sm truncate' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

function CronCard({ cron, onOpen }: { cron: AdminCronSummary; onOpen: () => void }) {
  const last = cron.lastExecution;
  const errorRate = cron.totalExecutions > 0
    ? Math.round((cron.errorCount / cron.totalExecutions) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#1a2123] p-5 transition hover:border-[#f3f0ed]/12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Esquerda — nome + descrição */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wider text-[#f3f0ed]/40">
              {cronGroupName(cron.cronName)}
            </p>
            {last && <StatusBadge status={last.status} />}
          </div>
          <h3 className="mt-1 truncate font-mono text-sm font-semibold text-[#f3f0ed]">
            {shortCronName(cron.cronName)}
          </h3>
          <p className="mt-1.5 flex items-center gap-2 text-xs text-[#f3f0ed]/60">
            <Clock className="h-3 w-3 text-[#a2dd00]" />
            <span>{cron.scheduleHuman}</span>
            <span className="rounded bg-[#0e1416] px-1.5 py-0.5 font-mono text-[10px] text-[#f3f0ed]/40">
              {cron.schedule}
            </span>
          </p>
        </div>

        {/* Botão histórico */}
        <button
          onClick={onOpen}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#f3f0ed]/10 px-3 text-xs text-[#f3f0ed]/70 transition hover:bg-[#212a2c]"
        >
          Histórico
        </button>
      </div>

      {/* Métricas */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#f3f0ed]/6 pt-4 md:grid-cols-5">
        <Metric label="Próx. execução" value={cron.nextRunAt ? formatRelative(cron.nextRunAt) : '—'} sub={formatDate(cron.nextRunAt)} />
        <Metric label="Última" value={last ? formatRelative(last.startedAt) : '—'} sub={last ? formatDate(last.startedAt) : ''} />
        <Metric label="Duração média" value={formatDuration(cron.avgDurationMs)} />
        <Metric label="Execuções" value={String(cron.totalExecutions)} sub={`${cron.successCount} ok · ${cron.errorCount} erro`} />
        <Metric label="Taxa de erro" value={`${errorRate}%`} accent={errorRate > 10 ? 'red' : undefined} />
      </div>

      {/* Erro recente */}
      {last && last.status === 'ERROR' && last.error ? (
        <div className="mt-4 rounded-lg bg-red-500/10 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-red-300/90">
              {last.error.split('\n').slice(0, 2).join('\n')}
            </pre>
          </div>
        </div>
      ) : null}

      {/* Metadata do último sucesso */}
      {last?.status === 'SUCCESS' &&
       last.metadata &&
       typeof last.metadata === 'object' &&
       Object.keys(last.metadata as object).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(last.metadata as Record<string, unknown>).map(([k, v]) => (
            <span key={k} className="rounded-md bg-[#0e1416] px-2 py-1 text-[11px] text-[#f3f0ed]/60">
              <span className="text-[#f3f0ed]/40">{k}:</span>{' '}
              <span className="font-mono font-semibold text-[#a2dd00]">{safeStr(v)}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'red';
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#f3f0ed]/40">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent === 'red' ? 'text-red-400' : 'text-[#f3f0ed]'}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#f3f0ed]/40">{sub}</p>}
    </div>
  );
}

function ExecutionsDrawer({ cronName, onClose }: { cronName: string; onClose: () => void }) {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'crons', 'executions', cronName, page],
    queryFn: () => api.adminCrons.executions(accessToken!, { cronName, page, limit }),
    enabled: !!accessToken,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-[#141a1c] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#f3f0ed]/6 px-6 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[#f3f0ed]/40">Histórico</p>
            <h2 className="truncate font-mono text-sm font-semibold text-[#f3f0ed]">{cronName}</h2>
            {data && <p className="mt-1 text-xs text-[#f3f0ed]/50">{data.total} execuções no total</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/60 transition hover:bg-[#1a2123] hover:text-[#f3f0ed]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
            </div>
          )}
          {data && data.items.length === 0 && (
            <p className="text-center text-sm text-[#f3f0ed]/40">Nenhuma execução encontrada.</p>
          )}
          {data && data.items.length > 0 && (
            <div className="space-y-2">
              {data.items.map((item) => (
                <ExecutionRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Paginação */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/6 px-6 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#f3f0ed]/10 px-3 py-1.5 text-xs text-[#f3f0ed]/70 transition hover:bg-[#1a2123] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-[#f3f0ed]/50">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-[#f3f0ed]/10 px-3 py-1.5 text-xs text-[#f3f0ed]/70 transition hover:bg-[#1a2123] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutionRow({ item }: { item: AdminCronExecutionItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasError = Boolean(item.status === 'ERROR' && item.error);
  const hasMeta = Boolean(
    item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata as object).length > 0,
  );

  return (
    <div className="rounded-lg border border-[#f3f0ed]/6 bg-[#1a2123]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusBadge status={item.status} />
          <span className="text-xs text-[#f3f0ed]/80">{formatDate(item.startedAt)}</span>
          <span className="text-[10px] text-[#f3f0ed]/40">{formatRelative(item.startedAt)}</span>
        </div>
        <span className="shrink-0 text-xs text-[#f3f0ed]/60">{formatDuration(item.durationMs)}</span>
      </button>

      {expanded && (hasError || hasMeta) && (
        <div className="space-y-2 border-t border-[#f3f0ed]/6 px-4 py-3">
          {hasError && (
            <div className="rounded-md bg-red-500/10 px-3 py-2">
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-red-300/90">
                {item.error}
              </pre>
            </div>
          )}
          {hasMeta && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.metadata as Record<string, unknown>).map(([k, v]) => (
                <span key={k} className="rounded-md bg-[#0e1416] px-2 py-1 text-[11px] text-[#f3f0ed]/60">
                  <span className="text-[#f3f0ed]/40">{k}:</span>{' '}
                  <span className="font-mono font-semibold text-[#a2dd00]">{safeStr(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
