'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminStats } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CreditCard,
  DollarSign,
  Image,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Cog,
  TrendingUp,
} from 'lucide-react';

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border p-4 md:p-5 ${accent
          ? 'border-[#a2dd00]/20 bg-[#a2dd00]/5'
          : 'border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]'
        }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-bold uppercase tracking-widest md:text-[10px] md:tracking-[0.12em] ${accent ? 'text-[#a2dd00]/50' : 'text-[#f3f0ed]/30'
            }`}
        >
          {label}
        </span>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg md:h-8 md:w-8 ${accent ? 'bg-[#a2dd00]/10' : 'bg-[#f3f0ed]/5'
            }`}
        >
          <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${accent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
        </div>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums md:mt-3 md:text-3xl ${accent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#f3f0ed]/30">{sub}</p>}
    </div>
  );
}

function StatusBar({ stats }: { stats: AdminStats }) {
  const total =
    stats.generationsByStatus.completed +
    stats.generationsByStatus.failed +
    stats.generationsByStatus.processing +
    stats.generationsByStatus.pending;

  if (total === 0) return null;

  const segments = [
    { key: 'completed', value: stats.generationsByStatus.completed, color: '#a2dd00', label: 'Concluídas', icon: CheckCircle2 },
    { key: 'processing', value: stats.generationsByStatus.processing, color: '#60a5fa', label: 'Processando', icon: Cog },
    { key: 'pending', value: stats.generationsByStatus.pending, color: '#fbbf24', label: 'Pendentes', icon: Clock },
    { key: 'failed', value: stats.generationsByStatus.failed, color: '#f87171', label: 'Falhas', icon: XCircle },
  ];

  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[#f3f0ed]/40" />
        <h3 className="text-sm font-semibold text-[#f3f0ed]">Gerações por Status</h3>
      </div>

      {/* Bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div
              key={seg.key}
              className="h-full transition-all duration-700"
              style={{
                width: `${(seg.value / total) * 100}%`,
                backgroundColor: seg.color,
              }}
            />
          ) : null,
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => {
          const Icon = seg.icon;
          return (
            <div key={seg.key} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#f3f0ed]/60">{seg.label}</span>
                <div className="flex items-center gap-1">
                  <span className="text-base font-bold tabular-nums text-[#f3f0ed] md:text-lg">
                    {seg.value.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] text-[#f3f0ed]/30">
                    ({total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRevenue(cents: number) {
  const reais = cents / 100;
  return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">Visão geral do sistema</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Receita Total"
          value={formatRevenue(stats.totalRevenueCents)}
          icon={DollarSign}
          accent
        />
        <StatCard
          label="Usuários"
          value={stats.totalUsers.toLocaleString('pt-BR')}
          icon={Users}
        />
        <StatCard
          label="Assinaturas Ativas"
          value={stats.activeSubscriptions.toLocaleString('pt-BR')}
          icon={CreditCard}
        />
        <StatCard
          label="Total Gerações"
          value={stats.totalGenerations.toLocaleString('pt-BR')}
          icon={Image}
        />
      </div>

      {/* Generation status breakdown */}
      <StatusBar stats={stats} />
    </div>
  );
}
