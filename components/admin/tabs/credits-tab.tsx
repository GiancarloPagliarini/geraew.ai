'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Coins, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { AdminAreaChart } from '@/components/admin/charts/area-chart';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function CreditsTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'credit-stats'],
    queryFn: () => api.admin.creditStats(accessToken!),
    enabled: active && !!accessToken,
    refetchInterval: 60_000,
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
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Consumidos Hoje" value={(data.consumedToday ?? 0).toLocaleString('pt-BR')} icon={Coins} accent />
        <StatCard label="Consumidos Semana" value={(data.consumedWeek ?? 0).toLocaleString('pt-BR')} icon={Coins} />
        <StatCard label="Consumidos Mês" value={(data.consumedMonth ?? 0).toLocaleString('pt-BR')} icon={Coins} />
        <StatCard
          label="Reembolsos"
          value={(data.refunds?.count ?? 0).toLocaleString('pt-BR')}
          icon={RotateCcw}
          sub={`${(data.refunds?.totalAmount ?? 0).toLocaleString('pt-BR')} créditos devolvidos`}
        />
      </div>

      {/* Daily consumption chart */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Consumo Diário</h3>
        <AdminAreaChart
          data={data.dailyConsumption ?? []}
          dataKey="consumed"
          xAxisKey="date"
          color="#f59e0b"
          formatXAxis={formatDate}
        />
      </div>

      {/* Allocation vs Usage + Near limit users */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Alocação vs Uso</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-[#f3f0ed]/50">Taxa de utilização</span>
              <span className="text-lg font-bold tabular-nums text-[#a2dd00]">{(data.allocationVsUsage?.usagePercent ?? 0).toFixed(1)}%</span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(data.allocationVsUsage?.usagePercent ?? 0, 100)}%`,
                  backgroundColor: (data.allocationVsUsage?.usagePercent ?? 0) > 80 ? '#f87171' : (data.allocationVsUsage?.usagePercent ?? 0) > 50 ? '#fbbf24' : '#a2dd00',
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Usado</span>
                <span className="text-base font-bold tabular-nums text-[#f3f0ed]">{(data.allocationVsUsage?.totalUsed ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Alocado</span>
                <span className="text-base font-bold tabular-nums text-[#f3f0ed]">{(data.allocationVsUsage?.totalAllocated ?? 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]">
            <AlertCircle className="h-4 w-4 text-[#fbbf24]" />
            Usuários Perto do Limite
          </h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {(data.nearLimitUsers ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Nenhum usuário perto do limite</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.nearLimitUsers.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#f3f0ed]">{u.name || u.email}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">{u.planCreditsRemaining.toLocaleString('pt-BR')} / {u.creditsPerMonth.toLocaleString('pt-BR')}</p>
                    </div>
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                      style={{
                        backgroundColor: u.usagePercent > 95 ? '#f87171' + '20' : '#fbbf24' + '20',
                        color: u.usagePercent > 95 ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {u.usagePercent.toFixed(1)}%
                    </span>
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
