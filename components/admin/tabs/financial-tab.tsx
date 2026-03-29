'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { FinancialStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, Percent, ShoppingBag, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { AdminAreaChart } from '@/components/admin/charts/area-chart';
import { AdminBarChart } from '@/components/admin/charts/bar-chart';

const PLAN_COLORS: Record<string, string> = {
  starter: '#3b82f6',
  creator: '#10b981',
  pro: '#a78bfa',
  studio: '#f59e0b',
  free: '#6b7280',
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function FinancialTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'financial-stats'],
    queryFn: () => api.admin.financialStats(accessToken!),
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

  const revenueByPlanChart = data.revenueByPlan.map((r) => ({
    name: r.planName,
    value: r.revenueCents,
    slug: r.planSlug,
  }));

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="MRR" value={formatBRL(data.mrrCents)} icon={TrendingUp} accent />
        <StatCard label="ARPU" value={formatBRL(data.arpuCents)} icon={DollarSign} sub="Receita / usuário" />
        <StatCard
          label="Margem"
          value={`${data.marginPercent.toFixed(1)}%`}
          icon={Percent}
          sub={`Custo API: ${formatBRL(data.totalApiCostCents)}`}
          accent={data.marginPercent >= 40}
        />
        <StatCard label="Receita Período" value={formatBRL(data.totalRevenueCents)} icon={DollarSign} sub="Últimos 30 dias" />
      </div>

      {/* Daily revenue chart */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Receita Diária</h3>
        <AdminAreaChart
          data={data.dailyRevenue}
          dataKey="revenueCents"
          xAxisKey="date"
          formatValue={(v) => formatBRL(v)}
          formatXAxis={formatDate}
        />
      </div>

      {/* Revenue by plan + Boost sales */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Receita por Plano</h3>
          <AdminBarChart
            data={revenueByPlanChart}
            dataKey="value"
            xAxisKey="name"
            colors={revenueByPlanChart.map((r) => PLAN_COLORS[r.slug] ?? '#6b7280')}
            formatValue={(v) => formatBRL(v)}
          />
        </div>
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Boost Packages</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {data.boostSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Nenhuma venda</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.boostSales.map((b) => (
                  <div key={b.name} className="flex items-center justify-between border-b border-[#f3f0ed]/5 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[#f3f0ed]">{b.name}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">{b.credits.toLocaleString('pt-BR')} créditos · {formatBRL(b.priceCents)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-[#a2dd00]">{b.soldCount}x</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">{formatBRL(b.totalRevenueCents)}</p>
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
