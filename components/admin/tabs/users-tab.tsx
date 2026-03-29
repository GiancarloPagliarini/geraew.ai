'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, UserMinus, UserX, ArrowUpRight, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { Sparkline } from '@/components/admin/charts/sparkline';
import { AdminDonutChart } from '@/components/admin/charts/donut-chart';

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280',
  starter: '#3b82f6',
  creator: '#10b981',
  pro: '#a78bfa',
  studio: '#f59e0b',
};

export function UsersTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => api.admin.userStats(accessToken!),
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

  const sparkData = data.dailyNewUsers.map((d) => ({ value: d.count }));

  const donutData = data.planDistribution.map((p) => ({
    name: p.planName,
    value: p.userCount,
    color: PLAN_COLORS[p.planSlug] ?? '#6b7280',
  }));

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* New users cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Novos Hoje" value={data.newUsersToday.toLocaleString('pt-BR')} icon={UserPlus} accent>
          <Sparkline data={sparkData} />
        </StatCard>
        <StatCard label="Novos Semana" value={data.newUsersWeek.toLocaleString('pt-BR')} icon={UserPlus} />
        <StatCard label="Novos Mês" value={data.newUsersMonth.toLocaleString('pt-BR')} icon={UserPlus} />
        <StatCard label="Total Usuários" value={data.totalUsers.toLocaleString('pt-BR')} icon={Users} />
      </div>

      {/* Conversion, churn, inactive */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Conversão Free→Pago"
          value={`${data.conversionRate.toFixed(1)}%`}
          icon={ArrowUpRight}
          accent={data.conversionRate > 5}
          sub={`${data.paidUsers} pagantes de ${data.totalUsers}`}
        />
        <StatCard
          label="Churn Rate"
          value={`${data.churnRate.toFixed(1)}%`}
          icon={UserMinus}
          sub="Cancelamentos no período"
        />
        <StatCard
          label="Usuários Inativos"
          value={(data.inactiveUsers ?? 0).toLocaleString('pt-BR')}
          icon={UserX}
          sub="Nunca geraram conteúdo"
        />
      </div>

      {/* Plan distribution + Top consumers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Distribuição por Plano</h3>
          <AdminDonutChart data={donutData} />
        </div>
        <div className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Top 10 Consumidores</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {data.topConsumers.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.topConsumers.map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3 border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f0ed]/5 text-[10px] font-bold text-[#f3f0ed]/40">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#f3f0ed]">{u.name || u.email}</p>
                      <p className="truncate text-[10px] text-[#f3f0ed]/30">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-[#a2dd00]">{(u.totalCredits ?? 0).toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">créditos</p>
                    </div>
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
