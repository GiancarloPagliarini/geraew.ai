'use client';

import type { AdminStats, ProviderStat } from '@/lib/api';
import { StatCard } from '@/components/admin/stat-card';
import {
  Users,
  CreditCard,
  DollarSign,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
  Cog,
  TrendingUp,
  Server,
  Zap,
} from 'lucide-react';

function formatRevenue(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div key={seg.key} className="h-full transition-all duration-700" style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }} />
          ) : null,
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-[#f3f0ed]/60">{seg.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-base font-bold tabular-nums text-[#f3f0ed] md:text-lg">{seg.value.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-[#f3f0ed]/30">({total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderBreakdown({ stats }: { stats: AdminStats }) {
  const { generationsByProvider: bp } = stats;
  const total = bp.geraew + bp.kie;
  if (total === 0) return null;

  const segments = [
    { key: 'geraew', label: 'GeraEW Provider', value: bp.geraew, color: '#a2dd00' },
    { key: 'kie', label: 'KIE API', value: bp.kie, color: '#f59e0b' },
  ];

  const kieModels = [
    { key: 'nb2', label: 'Nano Banana 2', value: bp.kieBreakdown.nanoBanana2, color: '#f59e0b' },
    { key: 'nbp', label: 'Nano Banana Pro', value: bp.kieBreakdown.nanoBananaPro, color: '#fb923c' },
    { key: 'kling', label: 'Kling 2.6', value: bp.kieBreakdown.kling, color: '#fbbf24' },
  ];

  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Server className="h-4 w-4 text-[#f3f0ed]/40" />
        <h3 className="text-sm font-semibold text-[#f3f0ed]">Gerações por Provider</h3>
        <span className="ml-auto text-[10px] text-[#f3f0ed]/30">{total.toLocaleString('pt-BR')} total</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
        {segments.map((seg) => seg.value > 0 ? <div key={seg.key} className="h-full transition-all duration-700" style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }} /> : null)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        {segments.map((seg) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={seg.key} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-[#f3f0ed]/60">{seg.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tabular-nums text-[#f3f0ed] md:text-xl">{seg.value.toLocaleString('pt-BR')}</span>
                  <span className="text-[10px] text-[#f3f0ed]/30">({pct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {bp.kie > 0 && (
        <div className="mt-4 border-t border-[#f3f0ed]/5 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Detalhamento KIE API</span>
          <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
            {kieModels.map((m) => m.value > 0 ? <div key={m.key} className="h-full transition-all duration-700" style={{ width: `${(m.value / bp.kie) * 100}%`, backgroundColor: m.color }} /> : null)}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {kieModels.map((m) => {
              const pct = bp.kie > 0 ? ((m.value / bp.kie) * 100).toFixed(1) : '0.0';
              return (
                <div key={m.key} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-[#f3f0ed]/50">{m.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold tabular-nums text-[#f3f0ed]">{m.value.toLocaleString('pt-BR')}</span>
                      <span className="text-[9px] text-[#f3f0ed]/25">({pct}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const PROVIDER_COLORS: Record<string, string> = { geraew: '#a2dd00', 'nano-banana': '#f59e0b', 'nano-banana-2': '#f59e0b', 'nano-banana-pro': '#fb923c', unknown: '#6b7280' };
const PROVIDER_LABELS: Record<string, string> = { geraew: 'GeraEW', 'nano-banana': 'Nano Banana', 'nano-banana-2': 'Nano Banana 2', 'nano-banana-pro': 'Nano Banana Pro', unknown: 'Desconhecido' };

function ProviderCard({ stat, total }: { stat: ProviderStat; total: number }) {
  const color = PROVIDER_COLORS[stat.provider] ?? '#6b7280';
  const label = PROVIDER_LABELS[stat.provider] ?? stat.provider;
  const successRate = stat.total > 0 ? ((stat.completed / stat.total) * 100).toFixed(1) : '0.0';
  const pct = total > 0 ? ((stat.total / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-[#f3f0ed]">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-[#f3f0ed]/30">{pct}% do total</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Total</span>
          <span className="text-lg font-bold tabular-nums text-[#f3f0ed]">{stat.total.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Taxa OK</span>
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{successRate}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3f0ed]/30">Falhas</span>
          <span className="text-lg font-bold tabular-nums text-[#f87171]">{stat.failed.toLocaleString('pt-BR')}</span>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#f3f0ed]/5 pt-2">
        <span className="text-[10px] text-[#f3f0ed]/30">Créditos consumidos</span>
        <span className="text-xs font-bold tabular-nums text-[#f3f0ed]/60">{stat.creditsConsumed.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}

export function OverviewTab({ stats, providers }: { stats: AdminStats; providers: ProviderStat[] }) {
  return (
    <div className="flex flex-col gap-5 md:gap-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Receita Total" value={formatRevenue(stats.totalRevenueCents)} icon={DollarSign} accent />
        <StatCard label="Usuários" value={stats.totalUsers.toLocaleString('pt-BR')} icon={Users} />
        <StatCard label="Assinaturas Ativas" value={stats.activeSubscriptions.toLocaleString('pt-BR')} icon={CreditCard} />
        <StatCard label="Total Gerações" value={stats.totalGenerations.toLocaleString('pt-BR')} icon={Image} />
      </div>
      <StatusBar stats={stats} />
      <ProviderBreakdown stats={stats} />
      {providers.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-[#f3f0ed]/40" />
            <h3 className="text-sm font-semibold text-[#f3f0ed]">Gerações por Modelo</h3>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#f3f0ed]/30">
              <Zap className="h-3 w-3" />
              {providers.reduce((a, p) => a + p.total, 0).toLocaleString('pt-BR')} total
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {providers.map((stat) => (
              <ProviderCard key={stat.provider} stat={stat} total={providers.reduce((a, p) => a + p.total, 0)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
