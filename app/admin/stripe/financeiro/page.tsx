'use client';

import { useAuth } from '@/lib/auth-context';
import { api, type FinanceSummary, type MrrHistoryPoint, type PayingCustomerRow } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  DollarSign,
  Activity,
  Sparkles,
  Target,
  ShieldAlert,
  Search,
  ExternalLink,
} from 'lucide-react';
import { fmtCurrency, fmtUnix, statusColor, statusLabel } from '@/lib/stripe-fmt';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

function fmtPct(v: number, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

function fmtMonths(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '—';
  if (v >= 24) return `${(v / 12).toFixed(1)} anos`;
  return `${v.toFixed(1)} meses`;
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'green' | 'blue' | 'amber' | 'red' | 'violet';
  delta?: { value: string; positive: boolean };
}) {
  const toneClass = {
    default: 'text-[#f3f0ed]/70 bg-[#f3f0ed]/5',
    green: 'text-[#a2dd00] bg-[#a2dd00]/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    violet: 'text-violet-400 bg-violet-500/10',
  }[tone];

  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        {delta && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              delta.positive
                ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {delta.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/40">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#f3f0ed]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[#f3f0ed]/40">{hint}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-bold text-[#f3f0ed]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[#f3f0ed]/40">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MrrChart({ history, currency }: { history: MrrHistoryPoint[]; currency: string }) {
  if (!history.length) {
    return (
      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-6 text-center text-xs text-[#f3f0ed]/40">
        Sem histórico para exibir.
      </div>
    );
  }
  const max = Math.max(...history.map((h) => Math.max(h.paidInvoiceCents, Math.abs(h.netMrrCents))), 1);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
      <div className="flex min-w-[600px] items-end gap-2" style={{ height: 200 }}>
        {history.map((p) => {
          const pct = (p.paidInvoiceCents / max) * 100;
          const netPct = (Math.abs(p.netMrrCents) / max) * 100;
          return (
            <div key={p.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end gap-0.5">
                <div
                  className="flex-1 rounded-t bg-[#a2dd00]/30 transition-all hover:bg-[#a2dd00]/50"
                  style={{ height: `${pct}%`, minHeight: pct > 0 ? 2 : 0 }}
                  title={`Receita ${p.month}: ${fmtCurrency(p.paidInvoiceCents, currency)}`}
                />
                <div
                  className={`flex-1 rounded-t transition-all ${
                    p.netMrrCents >= 0 ? 'bg-blue-500/40 hover:bg-blue-500/60' : 'bg-red-500/40 hover:bg-red-500/60'
                  }`}
                  style={{ height: `${netPct}%`, minHeight: netPct > 0 ? 2 : 0 }}
                  title={`Net new MRR ${p.month}: ${fmtCurrency(p.netMrrCents, currency)}`}
                />
              </div>
              <p className="text-[9px] font-medium text-[#f3f0ed]/40">{p.month.slice(5)}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[#f3f0ed]/40">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[#a2dd00]/40" />
          Receita paga
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-500/40" />
          Net new MRR (positivo)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-red-500/40" />
          Net new MRR (negativo)
        </span>
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);

  const summary = useQuery({
    queryKey: ['admin-finance', 'summary'],
    queryFn: () => api.adminFinance.summary(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const history = useQuery({
    queryKey: ['admin-finance', 'mrr-history'],
    queryFn: () => api.adminFinance.mrrHistory(accessToken!, 12),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const customers = useQuery({
    queryKey: ['admin-finance', 'customers', onlyActive, search],
    queryFn: () =>
      api.adminFinance.customers(accessToken!, {
        limit: 100,
        onlyActive,
        search: search.trim() || undefined,
      }),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  if (summary.isLoading || !summary.data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const s: FinanceSummary = summary.data;
  const cur = s.currency;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-[#a2dd00]/15 bg-[#a2dd00]/5 px-4 py-3">
        <p className="text-[11px] font-medium text-[#a2dd00]">
          📊 Dados extraídos diretamente da API do Stripe — exclui usuários internos, afiliados e ajustes manuais sem fatura.
        </p>
        <p className="mt-1 text-[10px] text-[#f3f0ed]/50">
          Atualizado em {fmtUnix(Math.floor(s.generatedAt / 1000))}
        </p>
      </div>

      <Section title="Receita recorrente" subtitle="MRR/ARR vivos no Stripe agora">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="MRR" value={fmtCurrency(s.mrrCents, cur)} icon={DollarSign} tone="green" hint="Mensal recorrente normalizado" />
          <Kpi label="ARR" value={fmtCurrency(s.arrCents, cur)} icon={TrendingUp} tone="green" hint="MRR × 12" />
          <Kpi
            label="Receita líquida (30d)"
            value={fmtCurrency(s.netRevenueLast30dCents, cur)}
            icon={Activity}
            tone="blue"
            hint={`Bruto ${fmtCurrency(s.grossRevenueLast30dCents, cur)} − reembolsos ${fmtCurrency(s.refundedLast30dCents, cur)}`}
          />
          <Kpi label="ARPU" value={fmtCurrency(s.arpuCents, cur)} icon={Users} tone="violet" hint="MRR ÷ clientes pagantes" />
        </div>
      </Section>

      <Section title="Base ativa" subtitle="Apenas com cobrança real no Stripe">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Pagantes ativos"
            value={String(s.payingCustomers)}
            icon={Users}
            tone="green"
            delta={
              s.netGrowthLast30d !== 0
                ? {
                    value: `${s.netGrowthLast30d > 0 ? '+' : ''}${s.netGrowthLast30d}`,
                    positive: s.netGrowthLast30d >= 0,
                  }
                : undefined
            }
          />
          <Kpi label="Em trial" value={String(s.trialingCustomers)} icon={Sparkles} tone="blue" />
          <Kpi
            label="Past due"
            value={String(s.pastDueCustomers)}
            icon={AlertTriangle}
            tone="amber"
            hint={`MRR em risco: ${fmtCurrency(s.risk.pastDueAtRiskMrrCents, cur)}`}
          />
          <Kpi
            label="Vão cancelar no fim do período"
            value={String(s.risk.cancelAtPeriodEnd)}
            icon={ShieldAlert}
            tone="red"
            hint={`MRR programado a sair: ${fmtCurrency(s.risk.cancelAtPeriodEndMrrCents, cur)}`}
          />
        </div>
      </Section>

      <Section title="Saúde do negócio" subtitle="Churn, LTV, margem e payback">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Churn mensal"
            value={fmtPct(s.churnRateMonthly)}
            icon={TrendingDown}
            tone={s.churnRateMonthly > 0.08 ? 'red' : s.churnRateMonthly > 0.05 ? 'amber' : 'green'}
            hint={`${s.churnedLast30d} cancelaram em 30d`}
          />
          <Kpi
            label="LTV estimado"
            value={fmtCurrency(s.ltvCents, cur)}
            icon={Target}
            tone="violet"
            hint={`≈ ${fmtMonths(s.ltvMonths)} de vida × margem`}
          />
          <Kpi
            label="Margem bruta (30d)"
            value={fmtPct(s.marginLast30d)}
            icon={Activity}
            tone={s.marginLast30d > 0.5 ? 'green' : s.marginLast30d > 0.3 ? 'amber' : 'red'}
            hint={`Custo IA: ${fmtCurrency(s.costLast30dBrlCents, cur)}`}
          />
          <Kpi
            label="Crescimento médio MRR"
            value={fmtPct(s.forecast.monthlyGrowthRate)}
            icon={TrendingUp}
            tone={s.forecast.monthlyGrowthRate >= 0 ? 'green' : 'red'}
            hint="Média dos últimos 6 meses"
          />
        </div>
        <p className="text-[11px] text-[#f3f0ed]/40">
          {s.ltvCacRatioHint}
        </p>
      </Section>

      <Section title="Histórico de receita (últimos 12 meses)" subtitle="Faturas pagas e net new MRR por mês">
        {history.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
          </div>
        ) : (
          <MrrChart history={history.data ?? []} currency={cur} />
        )}
        {history.data && history.data.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#f3f0ed]/6">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase">Mês</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Faturas pagas</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Novo MRR</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Churn MRR</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Net new MRR</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Reembolsos</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Clientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.data.map((p) => (
                  <TableRow key={p.month} className="border-[#f3f0ed]/6">
                    <TableCell className="font-medium text-[#f3f0ed]">{p.month}</TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/80">
                      {fmtCurrency(p.paidInvoiceCents, cur)}
                    </TableCell>
                    <TableCell className="text-right text-[#a2dd00]">
                      +{fmtCurrency(p.newMrrCents, cur)}
                    </TableCell>
                    <TableCell className="text-right text-red-400">
                      −{fmtCurrency(p.churnMrrCents, cur)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        p.netMrrCents >= 0 ? 'text-[#a2dd00]' : 'text-red-400'
                      }`}
                    >
                      {p.netMrrCents >= 0 ? '+' : ''}
                      {fmtCurrency(p.netMrrCents, cur)}
                    </TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/50">
                      {fmtCurrency(p.refundCents, cur)}
                    </TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/70">
                      {p.uniquePayingCustomers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section title="Previsão de MRR" subtitle="Projeção linear baseada no crescimento médio dos últimos meses">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Kpi
            label="Próximo mês"
            value={fmtCurrency(s.forecast.nextMonthMrrCents, cur)}
            icon={TrendingUp}
            tone="blue"
          />
          <Kpi
            label="Em 3 meses"
            value={fmtCurrency(s.forecast.in3MonthsMrrCents, cur)}
            icon={TrendingUp}
            tone="blue"
          />
          <Kpi
            label="Em 6 meses"
            value={fmtCurrency(s.forecast.in6MonthsMrrCents, cur)}
            icon={TrendingUp}
            tone="violet"
          />
        </div>
      </Section>

      <Section title="MRR por plano" subtitle="Quanto cada price está gerando agora">
        <div className="overflow-x-auto rounded-2xl border border-[#f3f0ed]/6">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase">Produto</TableHead>
                <TableHead className="text-[10px] uppercase">Price</TableHead>
                <TableHead className="text-right text-[10px] uppercase">Valor</TableHead>
                <TableHead className="text-right text-[10px] uppercase">Assinantes</TableHead>
                <TableHead className="text-right text-[10px] uppercase">MRR</TableHead>
                <TableHead className="text-right text-[10px] uppercase">% do MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.cohorts.activeByPlan.map((c) => (
                <TableRow key={c.priceId} className="border-[#f3f0ed]/6">
                  <TableCell className="font-medium text-[#f3f0ed]">
                    {c.productName ?? c.nickname ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-[#f3f0ed]/40">
                    {c.priceId}
                  </TableCell>
                  <TableCell className="text-right text-[#f3f0ed]/80">
                    {fmtCurrency(c.unitAmountCents, cur)}
                    <span className="text-[10px] text-[#f3f0ed]/30">
                      {' '}/ {c.intervalMonths === 1 ? 'mês' : c.intervalMonths === 12 ? 'ano' : `${c.intervalMonths.toFixed(1)}m`}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[#f3f0ed]/80">{c.subscribers}</TableCell>
                  <TableCell className="text-right font-semibold text-[#a2dd00]">
                    {fmtCurrency(c.mrrCents, cur)}
                  </TableCell>
                  <TableCell className="text-right text-[#f3f0ed]/50">
                    {fmtPct(s.mrrCents > 0 ? c.mrrCents / s.mrrCents : 0, 1)}
                  </TableCell>
                </TableRow>
              ))}
              {s.cohorts.activeByPlan.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-xs text-[#f3f0ed]/40">
                    Nenhuma assinatura ativa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Clientes pagantes" subtitle="Apenas usuários com fatura no Stripe — ordenados por MRR atual">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
            <Input
              placeholder="Buscar email, nome ou ID Stripe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full border-[#f3f0ed]/8 bg-[#f3f0ed]/3 pl-9 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#f3f0ed]/60">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#a2dd00]"
            />
            Somente assinaturas ativas
          </label>
          {customers.data && (
            <span className="text-xs text-[#f3f0ed]/40">
              {customers.data.rows.length} de {customers.data.total} clientes
            </span>
          )}
        </div>

        {customers.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#f3f0ed]/6">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase">Cliente</TableHead>
                  <TableHead className="text-[10px] uppercase">Plano</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">MRR atual</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Total pago</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Faturas</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">Tempo</TableHead>
                  <TableHead className="text-right text-[10px] uppercase">LTV estimado</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customers.data?.rows ?? []).map((row: PayingCustomerRow) => (
                  <TableRow key={row.customerId} className="border-[#f3f0ed]/6">
                    <TableCell className="min-w-[180px]">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#f3f0ed]">
                          {row.email ?? row.name ?? row.customerId}
                        </span>
                        {row.name && row.email && (
                          <span className="text-[11px] text-[#f3f0ed]/40">{row.name}</span>
                        )}
                        <span className="font-mono text-[10px] text-[#f3f0ed]/30">
                          {row.customerId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/70">
                      {row.currentPlan ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(row.status)}>
                        {statusLabel(row.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#a2dd00]">
                      {row.currentMrrCents > 0 ? fmtCurrency(row.currentMrrCents, cur) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/80">
                      {fmtCurrency(row.totalPaidCents, cur)}
                    </TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/60">
                      {row.invoiceCount}
                    </TableCell>
                    <TableCell className="text-right text-[#f3f0ed]/60">
                      {row.tenureMonths > 0 ? `${row.tenureMonths}m` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-violet-400">
                      {fmtCurrency(row.estimatedLtvCents, cur)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/stripe/clientes/${row.customerId}`}
                        className="text-[#f3f0ed]/40 hover:text-[#a2dd00]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.data && customers.data.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-xs text-[#f3f0ed]/40">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4 text-[11px] text-[#f3f0ed]/40">
        <p className="font-semibold text-[#f3f0ed]/60">Notas técnicas</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>MRR e ARR são normalizados a partir de cada price recorrente (anual ÷ 12, semanal × 4,345 etc.).</li>
          <li>Churn = cancelamentos nos últimos 30 dias ÷ (ativos + cancelados no período).</li>
          <li>LTV ≈ ARPU × margem bruta × (1 / churn). Cap mínimo de 10% e máximo de 95% na margem para evitar distorções.</li>
          <li>Margem bruta usa custo IA estimado (créditos consumidos × custo médio por crédito). Ajuste via env <code>BLENDED_COST_PER_CREDIT_BRL</code>.</li>
          <li>Forecast é uma projeção linear da taxa média de crescimento mensal — útil como sinal, não como compromisso.</li>
        </ul>
      </div>
    </div>
  );
}
