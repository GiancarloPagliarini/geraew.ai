'use client';

import { useMemo } from 'react';
import type { AdminFeedback } from '@/lib/api';
import {
  goalDistribution,
  featureDistribution,
  planDistribution,
  ratingDistribution,
  npsBreakdown,
  timeSeries,
  type CountItem,
} from '@/lib/feedback-analytics';
import { computeFilteredStats } from '@/lib/feedback-pdf';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import { Target, Layers, TrendingUp, Star, Calendar, Crown } from 'lucide-react';

const LIME = '#a2dd00';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const NPS_COLORS: Record<string, string> = {
  promoter: LIME,
  passive: AMBER,
  detractor: RED,
};

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; payload?: { label?: string } }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const title = payload[0]?.payload?.label ?? label;
  return (
    <div className="rounded-lg border border-[#f3f0ed]/10 bg-[#1a2123] px-3 py-2 text-xs shadow-xl">
      {title && <div className="font-semibold text-[#f3f0ed]">{title}</div>}
      <div className="text-[#a2dd00]">
        {payload[0].value} {suffix ?? ''}
      </div>
    </div>
  );
}

export default function FeedbackDashboard({ items }: { items: AdminFeedback[] }) {
  const stats = useMemo(() => computeFilteredStats(items), [items]);
  const goals = useMemo(() => goalDistribution(items), [items]);
  const features = useMemo(() => featureDistribution(items), [items]);
  const plans = useMemo(() => planDistribution(items), [items]);
  const ratings = useMemo(() => ratingDistribution(items), [items]);
  const nps = useMemo(() => npsBreakdown(items), [items]);
  const series = useMemo(() => timeSeries(items), [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f3f0ed]/10 py-20 text-center">
        <TrendingUp className="h-8 w-8 text-[#f3f0ed]/20" />
        <p className="text-sm text-[#f3f0ed]/40">Sem dados para os filtros selecionados.</p>
      </div>
    );
  }

  const topGoal = goals[0];
  const topFeature = features[0];

  return (
    <div id="feedback-dashboard-export" className="flex flex-col gap-4">
      {/* Insights de destaque */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          icon={<Target className="h-4 w-4" />}
          label="Objetivo nº 1"
          value={topGoal?.label ?? '—'}
          hint={topGoal ? `${topGoal.pct}% dos usuários` : undefined}
        />
        <InsightCard
          icon={<Layers className="h-4 w-4" />}
          label="Funcionalidade nº 1"
          value={topFeature?.label ?? '—'}
          hint={topFeature ? `citada por ${topFeature.pct}%` : undefined}
        />
        <InsightCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="NPS Score"
          value={stats.npsScore !== null ? String(stats.npsScore) : '—'}
          hint={`${stats.promoters} prom. · ${stats.detractors} detr.`}
        />
        <InsightCard
          icon={<Star className="h-4 w-4" />}
          label="Rating médio"
          value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : '—'}
          hint={`${stats.total} feedbacks`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Objetivos */}
        <ChartCard
          icon={<Target className="h-4 w-4 text-[#a2dd00]" />}
          title="Objetivo dos usuários"
          subtitle="Para que vieram usar a GeraEW"
        >
          <HorizontalBars data={goals} />
        </ChartCard>

        {/* Funcionalidades */}
        <ChartCard
          icon={<Layers className="h-4 w-4 text-[#a2dd00]" />}
          title="Funcionalidades mais citadas"
          subtitle="O que mais interessa ao público"
        >
          <HorizontalBars data={features} suffix="menções" />
        </ChartCard>

        {/* NPS donut */}
        <ChartCard
          icon={<TrendingUp className="h-4 w-4 text-[#a2dd00]" />}
          title="Distribuição de NPS"
          subtitle="Promotores · Neutros · Detratores"
        >
          <div className="flex items-center gap-4">
            <div className="h-[200px] w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nps}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {nps.map((entry) => (
                      <Cell key={entry.key} fill={NPS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {nps.map((n) => {
                const pct = stats.total ? Math.round((n.value / stats.total) * 100) : 0;
                return (
                  <div key={n.key} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: NPS_COLORS[n.key] }}
                    />
                    <span className="text-[#f3f0ed]/70">{n.label}</span>
                    <span className="ml-auto font-semibold text-[#f3f0ed] tabular-nums">
                      {n.value}
                    </span>
                    <span className="w-10 text-right text-xs text-[#f3f0ed]/40 tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartCard>

        {/* Rating */}
        <ChartCard
          icon={<Star className="h-4 w-4 text-[#a2dd00]" />}
          title="Distribuição de rating"
          subtitle="Notas de 1 a 5 estrelas"
        >
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratings} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ed14" vertical={false} />
                <XAxis
                  dataKey="rating"
                  tickFormatter={(v) => `${v}★`}
                  tick={{ fill: '#f3f0ed66', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#f3f0ed66', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: '#f3f0ed08' }} content={<ChartTooltip />} />
                <Bar dataKey="value" fill={LIME} radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="value" position="top" fill="#f3f0ed99" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Evolução no tempo */}
      <ChartCard
        icon={<Calendar className="h-4 w-4 text-[#a2dd00]" />}
        title="Feedbacks ao longo do tempo"
        subtitle="Volume diário de respostas"
      >
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fbArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIME} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={LIME} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f0ed14" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#f3f0ed66', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#f3f0ed66', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip cursor={{ stroke: '#f3f0ed22' }} content={<ChartTooltip suffix="feedback(s)" />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={LIME}
                strokeWidth={2}
                fill="url(#fbArea)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Planos */}
      {plans.length > 0 && (
        <ChartCard
          icon={<Crown className="h-4 w-4 text-[#a2dd00]" />}
          title="Feedbacks por plano"
          subtitle="De quais planos vêm as respostas"
        >
          <HorizontalBars data={plans} />
        </ChartCard>
      )}
    </div>
  );
}

function HorizontalBars({ data, suffix }: { data: CountItem[]; suffix?: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Sem dados.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.key} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-[#f3f0ed]/70" title={d.label}>
            {d.label}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-[#f3f0ed]/[0.04]">
            <div
              className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-[#a2dd00]/40 to-[#a2dd00]/80"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-xs text-[#f3f0ed]/50 tabular-nums">
            {d.value} · {d.pct}%
          </span>
        </div>
      ))}
      {suffix && <p className="mt-1 text-[10px] text-[#f3f0ed]/30">% relativo ao total de feedbacks</p>}
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#f3f0ed]/40">
        <span className="text-[#a2dd00]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate text-lg font-bold text-[#f3f0ed]" title={value}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-[#f3f0ed]/30">{hint}</div>}
    </div>
  );
}

function ChartCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-semibold text-[#f3f0ed]">{title}</h3>
          {subtitle && <p className="text-[11px] text-[#f3f0ed]/40">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
