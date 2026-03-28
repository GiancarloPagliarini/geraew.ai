'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { AdminAreaChart } from '@/components/admin/charts/area-chart';
import { AdminBarChart } from '@/components/admin/charts/bar-chart';
import { AdminDonutChart } from '@/components/admin/charts/donut-chart';

const TYPE_COLORS: Record<string, string> = {
  TEXT_TO_IMAGE: '#a2dd00',
  IMAGE_TO_IMAGE: '#60a5fa',
  TEXT_TO_VIDEO: '#f59e0b',
  IMAGE_TO_VIDEO: '#fb923c',
  MOTION_CONTROL: '#a78bfa',
  REFERENCE_VIDEO: '#f472b6',
};

const TYPE_LABELS: Record<string, string> = {
  TEXT_TO_IMAGE: 'Texto → Imagem',
  IMAGE_TO_IMAGE: 'Imagem → Imagem',
  TEXT_TO_VIDEO: 'Texto → Vídeo',
  IMAGE_TO_VIDEO: 'Imagem → Vídeo',
  MOTION_CONTROL: 'Motion Control',
  REFERENCE_VIDEO: 'Vídeo Referência',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function UsageTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'usage-stats'],
    queryFn: () => api.admin.usageStats(accessToken!),
    enabled: active && !!accessToken,
    refetchInterval: 30_000,
  });

  if (!active) return null;

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const stuckCount = data.stuckGenerations?.length ?? 0;

  const typeDonutData = (data.byType ?? []).map((g) => ({
    name: TYPE_LABELS[g.type] ?? g.type,
    value: g.count,
    color: TYPE_COLORS[g.type] ?? '#6b7280',
  }));

  const peakHoursData = Array.from({ length: 24 }, (_, h) => {
    const found = (data.peakHours ?? []).find((p) => p.hour === h);
    return { hour: `${String(h).padStart(2, '0')}h`, count: found?.count ?? 0 };
  });

  const maxPeakCount = Math.max(...peakHoursData.map((d) => d.count), 1);
  const peakColors = peakHoursData.map((d) => {
    const intensity = d.count / maxPeakCount;
    if (intensity > 0.7) return '#f87171';
    if (intensity > 0.4) return '#fbbf24';
    return '#a2dd00';
  });

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* Stuck generations alert */}
      {stuckCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#f87171]/30 bg-[#f87171]/5 p-4">
          <AlertTriangle className="h-5 w-5 text-[#f87171]" />
          <div>
            <p className="text-sm font-bold text-[#f87171]">{stuckCount} geração(ões) travada(s)</p>
            <p className="text-xs text-[#f3f0ed]/40">Processando há mais de 10 minutos</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total Gerações" value={data.dailyGenerations.reduce((a, d) => a + d.count, 0).toLocaleString('pt-BR')} icon={Activity} sub="No período" />
        <StatCard label="Tipos Ativos" value={String((data.byType ?? []).length)} icon={Activity} />
        <StatCard label="Stuck Agora" value={String(stuckCount)} icon={AlertTriangle} accent={stuckCount === 0} />
      </div>

      {/* Daily generations chart */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Gerações por Dia</h3>
        <AdminAreaChart
          data={data.dailyGenerations}
          dataKey="count"
          xAxisKey="date"
          formatXAxis={formatDate}
        />
      </div>

      {/* Type breakdown + Processing time + Error rate */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Por Tipo</h3>
          <AdminDonutChart data={typeDonutData} height={200} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Tempo Médio (por modelo)</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {(data.avgProcessingByModel ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.avgProcessingByModel.map((m) => (
                  <div key={m.modelUsed} className="flex items-center justify-between border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-medium text-[#f3f0ed]">{m.modelUsed}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">{m.count} gerações</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold tabular-nums text-[#f3f0ed]">{formatMs(m.avgMs)}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">P95: {formatMs(m.p95Ms)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Taxa de Erro (por modelo)</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {(data.errorRateByModel ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.errorRateByModel.map((m) => {
                  const color = m.errorRate > 5 ? '#f87171' : m.errorRate > 2 ? '#fbbf24' : '#a2dd00';
                  return (
                    <div key={m.modelUsed}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#f3f0ed]/60">{m.modelUsed}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color }}>{m.errorRate}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f3f0ed]/5">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(m.errorRate, 100)}%`, backgroundColor: color }} />
                      </div>
                      <p className="mt-0.5 text-[9px] text-[#f3f0ed]/25">{m.failed} falhas de {m.total}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Peak hours */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Horários de Pico</h3>
        <AdminBarChart
          data={peakHoursData}
          dataKey="count"
          xAxisKey="hour"
          colors={peakColors}
          height={200}
        />
      </div>

      {/* Stuck generations table */}
      {(data.stuckGenerations ?? []).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#f87171]">Gerações Travadas</h3>
          <div className="rounded-2xl border border-[#f87171]/20 bg-[#f87171]/5 p-4">
            <div className="flex flex-col gap-2">
              {data.stuckGenerations.map((g) => {
                const stuckMin = Math.round((Date.now() - new Date(g.createdAt).getTime()) / 60000);
                return (
                  <div key={g.id} className="flex items-center justify-between border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-medium text-[#f3f0ed]">{g.type}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">{g.modelUsed}</p>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-[#f87171]">{stuckMin}min</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
