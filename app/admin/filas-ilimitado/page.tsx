'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  Clock,
  Hourglass,
  Infinity as InfinityIcon,
  Loader2,
  PauseCircle,
  Play,
  RefreshCw,
  Timer,
  X,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import { api, UnlimitedJobStatus, UnlimitedTopUser } from '@/lib/api';

const STATUS_TABS: { key: UnlimitedJobStatus; label: string; icon: typeof Clock }[] = [
  { key: 'waiting', label: 'Aguardando', icon: Hourglass },
  { key: 'active', label: 'Ativos', icon: Play },
  { key: 'delayed', label: 'Em delay', icon: Clock },
  { key: 'completed', label: 'Concluídos', icon: CheckCircle2 },
  { key: 'failed', label: 'Falharam', icon: XCircle },
  { key: 'paused', label: 'Pausados', icon: PauseCircle },
];

function statusColor(status: UnlimitedJobStatus): string {
  switch (status) {
    case 'waiting':
      return '#fbbf24';
    case 'active':
      return '#a2dd00';
    case 'delayed':
      return '#a855f7';
    case 'completed':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'paused':
      return '#94a3b8';
  }
}

function planColor(slug: string | null | undefined): string {
  if (!slug) return 'rgba(243,240,237,0.2)';
  if (slug === 'studio') return '#a855f7';
  if (slug === 'advanced') return '#3b82f6';
  if (slug === 'pro') return '#10b981';
  if (slug === 'creator') return '#f59e0b';
  return 'rgba(243,240,237,0.4)';
}

function fmtDate(s: string | Date | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('pt-BR', { hour12: false });
}

function fmtRelative(s: string | Date | null): string {
  if (!s) return '—';
  const ms = new Date(s).getTime() - Date.now();
  if (Math.abs(ms) < 1000) return 'agora';
  const sec = Math.round(ms / 1000);
  if (Math.abs(sec) < 60) return `${sec > 0 ? `em ${sec}s` : `${-sec}s atrás`}`;
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return min > 0 ? `em ${min}min` : `${-min}min atrás`;
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return h > 0 ? `em ${h}h` : `${-h}h atrás`;
  return new Date(s).toLocaleDateString('pt-BR');
}

export default function FilasIlimitadoPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UnlimitedJobStatus>('waiting');
  const [delayModalUser, setDelayModalUser] = useState<UnlimitedTopUser | null>(null);
  const [delayInput, setDelayInput] = useState<string>('60');
  const [ttlInput, setTtlInput] = useState<string>('60');

  const setDelayMutation = useMutation({
    mutationFn: ({
      userId,
      delaySeconds,
      ttlMinutes,
    }: {
      userId: string;
      delaySeconds: number;
      ttlMinutes: number;
    }) =>
      api.admin.unlimitedSetManualDelay(accessToken!, userId, {
        delaySeconds,
        ttlMinutes,
      }),
    onSuccess: () => {
      toast.success('Delay manual aplicado.');
      setDelayModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'unlimited', 'usage'] });
    },
    onError: (err: Error) => {
      toast.error(err?.message ?? 'Erro ao aplicar delay.');
    },
  });

  const clearDelayMutation = useMutation({
    mutationFn: (userId: string) => api.admin.unlimitedClearManualDelay(accessToken!, userId),
    onSuccess: () => {
      toast.success('Delay manual removido.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'unlimited', 'usage'] });
    },
    onError: (err: Error) => {
      toast.error(err?.message ?? 'Erro ao remover delay.');
    },
  });

  const openDelayModal = (user: UnlimitedTopUser) => {
    setDelayInput(user.manualDelay ? String(Math.round(user.manualDelay.delayMs / 1000)) : '60');
    setTtlInput(user.manualDelay ? String(Math.max(1, Math.round(user.manualDelay.ttlSeconds / 60))) : '60');
    setDelayModalUser(user);
  };

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'unlimited', 'stats'],
    queryFn: () => api.admin.unlimitedQueueStats(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 5_000,
  });

  const { data: jobs, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['admin', 'unlimited', 'jobs', activeTab],
    queryFn: () => api.admin.unlimitedQueueJobs(accessToken!, activeTab, 100),
    enabled: !!accessToken,
    refetchInterval: 5_000,
  });

  const { data: usage } = useQuery({
    queryKey: ['admin', 'unlimited', 'usage'],
    queryFn: () => api.admin.unlimitedUsageOverview(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 15_000,
  });

  const refreshAll = () => {
    refetchStats();
    refetchJobs();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a855f7]/15">
              <InfinityIcon className="h-3.5 w-3.5 text-[#a855f7]" />
            </div>
            <h1 className="text-xl font-bold text-[#f3f0ed]">Fila Ilimitada</h1>
          </div>
          <p className="mt-1 text-[12px] text-[#f3f0ed]/40">
            Monitoramento em tempo real dos jobs do modo ilimitado e uso por plano.
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="flex items-center gap-1.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-1.5 text-[11px] font-medium text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]"
        >
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {STATUS_TABS.map((s) => {
          const count = stats?.counts[s.key] ?? 0;
          const Icon = s.icon;
          const color = statusColor(s.key);
          return (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className="relative flex flex-col items-start gap-1 rounded-xl border bg-[#f3f0ed]/[0.02] p-3 text-left transition-all hover:bg-[#f3f0ed]/[0.04]"
              style={{
                borderColor:
                  activeTab === s.key ? `${color}40` : 'rgba(243,240,237,0.07)',
                background:
                  activeTab === s.key
                    ? `${color}0d`
                    : 'rgba(243,240,237,0.02)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <Icon className="h-3 w-3" style={{ color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/50">
                  {s.label}
                </span>
              </div>
              <span className="text-xl font-bold text-[#f3f0ed]">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Paused warning */}
      {stats?.isPaused && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
          <AlertCircle className="h-3.5 w-3.5" />
          A fila está pausada. Nenhum job novo é processado até retomar.
        </div>
      )}

      {/* Jobs table */}
      <div className="rounded-xl border border-[#f3f0ed]/[0.07] bg-[#141a1c]">
        <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[#f3f0ed]">
            Jobs · {STATUS_TABS.find((s) => s.key === activeTab)?.label}
          </h2>
          {jobsLoading && <Loader2 className="h-3 w-3 animate-spin text-[#f3f0ed]/40" />}
        </div>

        {!jobs || jobs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[12px] text-[#f3f0ed]/30">
            Nenhum job nesse status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/[0.05] hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Usuário
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Plano
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Tipo
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Modelo
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Resolução
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Prioridade
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    Criado
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
                    {activeTab === 'delayed' ? 'Sai em' : 'Início'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.jobId} className="border-[#f3f0ed]/[0.04] hover:bg-[#f3f0ed]/[0.02]">
                    <TableCell className="text-[11px] text-[#f3f0ed]/80">
                      <div className="font-medium">{job.user?.name ?? '—'}</div>
                      <div className="text-[10px] text-[#f3f0ed]/40">
                        {job.user?.email ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.user?.planSlug ? (
                        <Badge
                          variant="outline"
                          className="border-current text-[10px] font-semibold uppercase"
                          style={{
                            color: planColor(job.user.planSlug),
                            borderColor: `${planColor(job.user.planSlug)}50`,
                            background: `${planColor(job.user.planSlug)}10`,
                          }}
                        >
                          {job.user.planSlug}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-[#f3f0ed]/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/70">
                      {job.jobName}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/70">
                      {job.payload.model ?? job.generation?.modelUsed ?? '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/70">
                      {job.payload.resolution ?? job.generation?.resolution ?? '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/70">
                      {job.priority ?? '—'}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/60">
                      {fmtRelative(job.timestamp)}
                    </TableCell>
                    <TableCell className="text-[11px] text-[#f3f0ed]/60">
                      {activeTab === 'delayed'
                        ? fmtRelative(job.delayUntil)
                        : job.processedOn
                          ? fmtRelative(job.processedOn)
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Usage overview (24h) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* By model */}
        <div className="rounded-xl border border-[#f3f0ed]/[0.07] bg-[#141a1c]">
          <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[#f3f0ed]">
              Gerações por modelo (24h)
            </h2>
            <span className="text-[10px] text-[#f3f0ed]/40">
              Total: {usage?.total ?? 0}
            </span>
          </div>
          {!usage || usage.byModel.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[12px] text-[#f3f0ed]/30">
              Sem gerações nas últimas 24h.
            </div>
          ) : (
            <div className="flex flex-col">
              {usage.byModel.map((row, i) => {
                const pct = usage.total > 0 ? (row.count / usage.total) * 100 : 0;
                return (
                  <div
                    key={`${row.modelVariant}-${row.resolution}`}
                    className={`flex items-center justify-between px-4 py-2.5 ${i < usage.byModel.length - 1 ? 'border-b border-[#f3f0ed]/[0.04]' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-[#f3f0ed]/80">
                        {row.modelVariant}
                      </span>
                      <span className="text-[10px] text-[#f3f0ed]/40">{row.resolution}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#f3f0ed]/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#a855f7]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] font-bold text-[#f3f0ed]">
                        {row.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top users */}
        <div className="rounded-xl border border-[#f3f0ed]/[0.07] bg-[#141a1c]">
          <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-[#f3f0ed]">
              Top usuários (24h)
            </h2>
            <span className="text-[10px] text-[#f3f0ed]/40">Top 20</span>
          </div>
          {!usage || usage.topUsers.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[12px] text-[#f3f0ed]/30">
              Sem dados.
            </div>
          ) : (
            <div className="flex flex-col">
              {usage.topUsers.map((u, i) => (
                <div
                  key={u.userId}
                  className={`flex items-center justify-between px-4 py-2.5 ${i < usage.topUsers.length - 1 ? 'border-b border-[#f3f0ed]/[0.04]' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center text-[10px] font-bold text-[#f3f0ed]/30">
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium text-[#f3f0ed]/80">
                        {u.name ?? u.email ?? u.userId}
                      </span>
                      <span className="text-[10px] text-[#f3f0ed]/40">{u.email ?? '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.manualDelay && (
                      <Badge
                        variant="outline"
                        className="border-[#a855f7]/40 bg-[#a855f7]/10 text-[9px] font-semibold uppercase text-[#a855f7]"
                        title={`Expira em ${Math.round(u.manualDelay.ttlSeconds / 60)}min`}
                      >
                        +{Math.round(u.manualDelay.delayMs / 1000)}s
                      </Badge>
                    )}
                    {u.planSlug && (
                      <Badge
                        variant="outline"
                        className="border-current text-[9px] font-semibold uppercase"
                        style={{
                          color: planColor(u.planSlug),
                          borderColor: `${planColor(u.planSlug)}50`,
                          background: `${planColor(u.planSlug)}10`,
                        }}
                      >
                        {u.planSlug}
                      </Badge>
                    )}
                    <span className="w-8 text-right text-[12px] font-bold text-[#f3f0ed]">
                      {u.count}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openDelayModal(u)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/60 transition-colors hover:border-[#a855f7]/40 hover:bg-[#a855f7]/10 hover:text-[#a855f7]"
                        title={u.manualDelay ? 'Editar delay manual' : 'Adicionar delay manual'}
                      >
                        <Timer className="h-3 w-3" />
                      </button>
                      {u.manualDelay && (
                        <button
                          onClick={() => clearDelayMutation.mutate(u.userId)}
                          disabled={clearDelayMutation.isPending}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/60 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                          title="Remover delay manual"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Last updated */}
      {stats && (
        <div className="text-center text-[10px] text-[#f3f0ed]/30">
          Atualiza automaticamente a cada 5s · Última atualização: {fmtDate(new Date())}
        </div>
      )}

      {/* Modal de delay manual */}
      {delayModalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDelayModalUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#a855f7]/30 bg-[#0c1012] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-[#a855f7]" />
                  <h3 className="text-[14px] font-bold text-[#f3f0ed]">
                    Delay manual
                  </h3>
                </div>
                <p className="mt-1 text-[11px] text-[#f3f0ed]/50">
                  {delayModalUser.name ?? delayModalUser.email ?? delayModalUser.userId}
                </p>
              </div>
              <button
                onClick={() => setDelayModalUser(null)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#f3f0ed]/70">
                  Delay extra (segundos)
                </label>
                <input
                  type="number"
                  min={0}
                  value={delayInput}
                  onChange={(e) => setDelayInput(e.target.value)}
                  className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-[12px] text-[#f3f0ed] outline-none focus:border-[#a855f7]/50"
                  placeholder="60"
                />
                <p className="mt-1 text-[10px] text-[#f3f0ed]/40">
                  Será somado ao delay da curva. Ex: 60 = +1min em cada geração.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-[#f3f0ed]/70">
                  Duração do delay (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  value={ttlInput}
                  onChange={(e) => setTtlInput(e.target.value)}
                  className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-[12px] text-[#f3f0ed] outline-none focus:border-[#a855f7]/50"
                  placeholder="60"
                />
                <p className="mt-1 text-[10px] text-[#f3f0ed]/40">
                  Por quanto tempo o delay continua aplicado. Depois disso, volta ao normal.
                </p>
              </div>

              {delayModalUser.manualDelay && (
                <div className="flex items-center gap-2 rounded-lg border border-[#a855f7]/20 bg-[#a855f7]/[0.06] px-3 py-2 text-[11px] text-[#a855f7]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Já tem delay ativo de +
                    {Math.round(delayModalUser.manualDelay.delayMs / 1000)}s
                    {' '}(expira em {Math.round(delayModalUser.manualDelay.ttlSeconds / 60)}min). Salvar
                    irá substituir.
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDelayModalUser(null)}
                className="rounded-lg border border-[#f3f0ed]/10 bg-transparent px-3 py-1.5 text-[11px] font-medium text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/[0.06]"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const delaySeconds = parseInt(delayInput, 10);
                  const ttlMinutes = parseInt(ttlInput, 10);
                  if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
                    toast.error('Delay inválido.');
                    return;
                  }
                  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
                    toast.error('Duração inválida.');
                    return;
                  }
                  setDelayMutation.mutate({
                    userId: delayModalUser.userId,
                    delaySeconds,
                    ttlMinutes,
                  });
                }}
                disabled={setDelayMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-[#a855f7]/40 bg-[#a855f7]/15 px-3 py-1.5 text-[11px] font-semibold text-[#a855f7] transition-colors hover:bg-[#a855f7]/25 disabled:opacity-50"
              >
                {setDelayMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Timer className="h-3 w-3" />
                )}
                Aplicar delay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
