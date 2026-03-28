'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, AlertOctagon, CreditCard, Server, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

export function HealthTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'health-stats'],
    queryFn: () => api.admin.healthStats(accessToken!),
    enabled: active && !!accessToken,
    refetchInterval: 10_000,
  });

  if (!active) return null;

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* Alerts */}
      {(data.alerts ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                alert.level === 'critical'
                  ? 'border-[#f87171]/30 bg-[#f87171]/5'
                  : 'border-[#fbbf24]/30 bg-[#fbbf24]/5'
              }`}
            >
              {alert.level === 'critical' ? (
                <AlertOctagon className="h-4 w-4 shrink-0 text-[#f87171]" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#fbbf24]" />
              )}
              <span className={`text-sm ${alert.level === 'critical' ? 'text-[#f87171]' : 'text-[#fbbf24]'}`}>
                {alert.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Queue stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Processando" value={String(data.queue?.processing ?? 0)} icon={Activity} accent={(data.queue?.processing ?? 0) === 0} />
        <StatCard label="Pendentes" value={String(data.queue?.pending ?? 0)} icon={Activity} />
        <StatCard
          label="Travadas"
          value={String(data.stuckCount ?? 0)}
          icon={AlertTriangle}
          accent={(data.stuckCount ?? 0) === 0}
        />
        <StatCard
          label="Pagamentos Falhando"
          value={String(data.failingPayments ?? 0)}
          icon={CreditCard}
          sub="Últimas 24h"
        />
      </div>

      {/* Provider failures + Error log */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Falhas por Provider (última hora)</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {(data.recentFailuresByModel ?? []).length === 0 ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Server className="h-4 w-4 text-[#a2dd00]" />
                <span className="text-sm text-[#a2dd00]">Nenhuma falha na última hora</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentFailuresByModel.map((f) => (
                  <div key={f.modelUsed} className="flex items-center justify-between border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#f3f0ed]">{f.modelUsed}</p>
                      {(f.errorCodes ?? []).length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {f.errorCodes.map((code) => (
                            <span key={code} className="rounded bg-[#f87171]/10 px-1.5 py-0.5 text-[9px] text-[#f87171]">{code}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-[#f87171]">{f.failedCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Últimos Erros</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {(data.recentErrors ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-[#a2dd00]">Nenhum erro recente</p>
            ) : (
              <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
                {data.recentErrors.map((e) => (
                  <div key={e.id} className="rounded-lg border border-[#f3f0ed]/5 bg-[#f3f0ed]/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#f3f0ed]/50">{e.modelUsed}</span>
                      <span className="text-[10px] text-[#f3f0ed]/30">
                        {new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {e.errorCode && (
                      <span className="mt-1 inline-block rounded bg-[#f87171]/10 px-1.5 py-0.5 text-[9px] text-[#f87171]">{e.errorCode}</span>
                    )}
                    {e.errorMessage && (
                      <p className="mt-1 text-xs text-[#f3f0ed]/40 line-clamp-2">{e.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
