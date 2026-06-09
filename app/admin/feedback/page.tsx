'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminFeedback } from '@/lib/api';
import {
  GOAL_LABELS,
  FEATURE_LABELS,
  NO_PLAN_LABEL,
  goalLabel,
  featureLabel,
  npsCategory,
  computeFilteredStats,
  exportFeedbacksPdf,
  exportDashboardPdf,
  DASHBOARD_CAPTURE,
  type NpsCategory,
  type DashboardImagePage,
} from '@/lib/feedback-pdf';
import { toCanvas } from 'html-to-image';
import {
  goalDistribution,
  featureDistribution,
  planDistribution,
  ratingDistribution,
  npsBreakdown,
  timeSeries,
} from '@/lib/feedback-analytics';
import FeedbackDashboard from './dashboard';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Coins,
  TrendingUp,
  TrendingDown,
  MessageSquareHeart,
  RefreshCw,
  Search,
  FileDown,
  X,
  SlidersHorizontal,
  List,
  LayoutDashboard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FilterSelect, FilterField } from '@/components/admin/filter-controls';

const NPS_FILTER_OPTIONS: { value: NpsCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'promoter', label: 'Promotores (9–10)' },
  { value: 'passive', label: 'Neutros (7–8)' },
  { value: 'detractor', label: 'Detratores (0–6)' },
];

const RATING_FILTER_OPTIONS = [
  { value: 0, label: 'Qualquer' },
  { value: 5, label: '5 estrelas' },
  { value: 4, label: '4+ estrelas' },
  { value: 3, label: '3+ estrelas' },
  { value: 2, label: '2+ estrelas' },
  { value: 1, label: '1+ estrela' },
];

const PAGE_SIZE = 20;

function npsBadge(score: number) {
  let cls = 'border-red-500/30 bg-red-500/10 text-red-400';
  if (score >= 9) cls = 'border-[#a2dd00]/40 bg-[#a2dd00]/10 text-[#a2dd00]';
  else if (score >= 6) cls = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
  return (
    <Badge variant="outline" className={`${cls} font-bold tabular-nums`}>
      {score}
    </Badge>
  );
}

function ratingStars(n: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? 'fill-[#a2dd00] text-[#a2dd00]' : 'text-[#f3f0ed]/15'}`}
        />
      ))}
    </div>
  );
}

function planBadge(plan: AdminFeedback['user']['plan']) {
  if (!plan) {
    return (
      <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/40">
        {NO_PLAN_LABEL}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-400">
      {plan.name}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const dateInputClass =
  'h-9 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] px-2.5 text-sm text-[#f3f0ed]/85 outline-none transition-colors [color-scheme:dark] hover:border-[#f3f0ed]/20 focus:border-[#a2dd00]/50';

type View = 'list' | 'dashboard';

// Captura o dashboard renderizado e fatia em páginas no aspect da A4 retrato,
// para serem anexadas ao final do PDF.
async function captureDashboardPages(node: HTMLElement): Promise<DashboardImagePage[]> {
  const canvas = await toCanvas(node, {
    backgroundColor: '#141a1c',
    pixelRatio: 2,
    cacheBust: true,
  });
  const cw = canvas.width;
  const ch = canvas.height;
  // Altura de cada fatia (px) que, na largura da página, preenche a área útil.
  const sliceH = Math.max(1, Math.floor(cw * (DASHBOARD_CAPTURE.contentH / DASHBOARD_CAPTURE.contentW)));
  const pages: DashboardImagePage[] = [];
  for (let yPx = 0; yPx < ch; yPx += sliceH) {
    const h = Math.min(sliceH, ch - yPx);
    const tmp = document.createElement('canvas');
    tmp.width = cw;
    tmp.height = h;
    const ctx = tmp.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#141a1c';
    ctx.fillRect(0, 0, cw, h);
    ctx.drawImage(canvas, 0, yPx, cw, h, 0, 0, cw, h);
    pages.push({ dataUrl: tmp.toDataURL('image/png'), wPx: cw, hPx: h });
  }
  return pages;
}

export default function AdminFeedbackPage() {
  const { accessToken } = useAuth();
  const [view, setView] = useState<View>('list');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [npsFilter, setNpsFilter] = useState<NpsCategory | 'all'>('all');
  const [goalFilter, setGoalFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'feedback', 'all'],
    queryFn: () => api.admin.feedbackListAll(accessToken!),
    enabled: !!accessToken,
  });

  const allItems = useMemo(() => data?.data ?? [], [data]);

  // Opções de plano derivadas dos dados
  const planOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const f of allItems) {
      if (f.user.plan) set.set(f.user.plan.slug, f.user.plan.name);
    }
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }));
  }, [allItems]);

  // Aplicação dos filtros
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return allItems.filter((f) => {
      if (q && !`${f.user.name} ${f.user.email}`.toLowerCase().includes(q)) return false;
      if (npsFilter !== 'all' && npsCategory(f.nps) !== npsFilter) return false;
      if (goalFilter !== 'all' && f.goal !== goalFilter) return false;
      if (featureFilter !== 'all' && !f.features.includes(featureFilter)) return false;
      if (planFilter !== 'all') {
        const slug = f.user.plan?.slug ?? 'free';
        if (slug !== planFilter) return false;
      }
      if (minRating > 0 && f.rating < minRating) return false;
      if (from || to) {
        const created = new Date(f.createdAt);
        if (from && created < from) return false;
        if (to && created > to) return false;
      }
      return true;
    });
  }, [allItems, search, npsFilter, goalFilter, featureFilter, planFilter, minRating, dateFrom, dateTo]);

  const stats = useMemo(() => computeFilteredStats(filtered), [filtered]);

  const hasFilters =
    search.trim() !== '' ||
    npsFilter !== 'all' ||
    goalFilter !== 'all' ||
    featureFilter !== 'all' ||
    planFilter !== 'all' ||
    minRating > 0 ||
    dateFrom !== '' ||
    dateTo !== '';

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch('');
    setNpsFilter('all');
    setGoalFilter('all');
    setFeatureFilter('all');
    setPlanFilter('all');
    setMinRating(0);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  // Chips de filtros ativos (remoção individual)
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (search.trim())
    activeChips.push({ label: `“${search.trim()}”`, onRemove: () => { setSearch(''); setPage(1); } });
  if (npsFilter !== 'all')
    activeChips.push({
      label: NPS_FILTER_OPTIONS.find((o) => o.value === npsFilter)?.label ?? npsFilter,
      onRemove: () => { setNpsFilter('all'); setPage(1); },
    });
  if (goalFilter !== 'all')
    activeChips.push({
      label: GOAL_LABELS[goalFilter] ?? goalFilter,
      onRemove: () => { setGoalFilter('all'); setPage(1); },
    });
  if (featureFilter !== 'all')
    activeChips.push({
      label: FEATURE_LABELS[featureFilter] ?? featureFilter,
      onRemove: () => { setFeatureFilter('all'); setPage(1); },
    });
  if (planFilter !== 'all')
    activeChips.push({
      label: planOptions.find((p) => p.slug === planFilter)?.name ?? (planFilter === 'free' ? NO_PLAN_LABEL : planFilter),
      onRemove: () => { setPlanFilter('all'); setPage(1); },
    });
  if (minRating > 0)
    activeChips.push({ label: `Rating ≥ ${minRating}`, onRemove: () => { setMinRating(0); setPage(1); } });
  if (dateFrom)
    activeChips.push({ label: `De ${dateFrom}`, onRemove: () => { setDateFrom(''); setPage(1); } });
  if (dateTo)
    activeChips.push({ label: `Até ${dateTo}`, onRemove: () => { setDateTo(''); setPage(1); } });

  function buildFiltersSummary(): string[] {
    return activeChips.map((c) => c.label);
  }

  async function handleExport() {
    if (filtered.length === 0) {
      toast.error('Nenhum feedback para exportar com os filtros atuais.');
      return;
    }
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const filtersSummary = buildFiltersSummary();
      const generatedAt = new Date();
      if (view === 'dashboard') {
        // Captura visual do dashboard (best-effort: se falhar, exporta só os dados).
        let dashboardPages: DashboardImagePage[] | undefined;
        const node = document.getElementById('feedback-dashboard-export');
        if (node) {
          try {
            dashboardPages = await captureDashboardPages(node as HTMLElement);
          } catch (e) {
            console.error('Falha ao capturar o dashboard:', e);
            toast.warning('Não foi possível anexar a imagem do dashboard; exportando só os dados.');
          }
        }
        exportDashboardPdf({
          generatedAt,
          filtersSummary,
          stats,
          goals: goalDistribution(filtered),
          features: featureDistribution(filtered),
          plans: planDistribution(filtered),
          ratings: ratingDistribution(filtered),
          nps: npsBreakdown(filtered),
          series: timeSeries(filtered),
          dashboardPages,
        });
        toast.success('Dashboard exportado em PDF.');
      } else {
        exportFeedbacksPdf({ items: filtered, filtersSummary, generatedAt });
        toast.success(`PDF gerado com ${filtered.length} feedback(s).`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar o PDF.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Feedback</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            {hasFilters
              ? `${totalFiltered.toLocaleString('pt-BR')} de ${allItems.length.toLocaleString('pt-BR')} feedbacks`
              : `${allItems.length.toLocaleString('pt-BR')} feedbacks recebidos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="inline-flex rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-1">
            <TabButton active={view === 'list'} onClick={() => setView('list')} icon={<List className="h-4 w-4" />}>
              Lista
            </TabButton>
            <TabButton
              active={view === 'dashboard'}
              onClick={() => setView('dashboard')}
              icon={<LayoutDashboard className="h-4 w-4" />}
            >
              Dashboard
            </TabButton>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || isLoading || filtered.length === 0}
            className="flex h-9 items-center gap-2 rounded-xl border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3.5 text-sm font-semibold text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {view === 'dashboard' ? 'Exportar dashboard' : 'Exportar lista'}
            </span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-[#f3f0ed]/8 bg-gradient-to-b from-[#f3f0ed]/[0.04] to-[#f3f0ed]/[0.01] p-3 md:p-4">
        {/* Linha 1: busca + título */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#f3f0ed]/40">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#a2dd00]" />
            Filtros
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nome ou email…"
              className="h-9 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] pl-9 pr-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 outline-none transition-colors focus:border-[#a2dd00]/50"
            />
          </div>
        </div>

        {/* Linha 2: selects com label */}
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <FilterField label="NPS">
            <FilterSelect
              value={npsFilter}
              onChange={(v) => { setNpsFilter(v as NpsCategory | 'all'); setPage(1); }}
              options={NPS_FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </FilterField>

          <FilterField label="Objetivo">
            <FilterSelect
              value={goalFilter}
              onChange={(v) => { setGoalFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Todos' },
                ...Object.entries(GOAL_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </FilterField>

          <FilterField label="Funcionalidade">
            <FilterSelect
              value={featureFilter}
              onChange={(v) => { setFeatureFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Todas' },
                ...Object.entries(FEATURE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </FilterField>

          <FilterField label="Plano">
            <FilterSelect
              value={planFilter}
              onChange={(v) => { setPlanFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'free', label: NO_PLAN_LABEL },
                ...planOptions
                  .filter((p) => p.slug !== 'free')
                  .map((p) => ({ value: p.slug, label: p.name })),
              ]}
            />
          </FilterField>

          <FilterField label="Rating mínimo">
            <FilterSelect
              value={String(minRating)}
              onChange={(v) => { setMinRating(Number(v)); setPage(1); }}
              options={RATING_FILTER_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />
          </FilterField>

          <FilterField label="Período" className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className={dateInputClass}
              />
              <span className="text-xs text-[#f3f0ed]/30">até</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className={dateInputClass}
              />
            </div>
          </FilterField>
        </div>

        {/* Linha 3: chips de filtros ativos */}
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#f3f0ed]/6 pt-3">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                onClick={chip.onRemove}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[#a2dd00]/25 bg-[#a2dd00]/10 py-1 pl-3 pr-2 text-xs font-medium text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20"
              >
                {chip.label}
                <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              </button>
            ))}
            <button
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" />
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : view === 'dashboard' ? (
        <FeedbackDashboard items={filtered} />
      ) : (
        <ListView
          stats={stats}
          hasFilters={hasFilters}
          allCount={allItems.length}
          pageItems={pageItems}
          expanded={expanded}
          setExpanded={setExpanded}
          currentPage={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          resetFilters={resetFilters}
        />
      )}
    </div>
  );
}

function ListView({
  stats,
  hasFilters,
  allCount,
  pageItems,
  expanded,
  setExpanded,
  currentPage,
  totalPages,
  setPage,
  resetFilters,
}: {
  stats: ReturnType<typeof computeFilteredStats>;
  hasFilters: boolean;
  allCount: number;
  pageItems: AdminFeedback[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  currentPage: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  resetFilters: () => void;
}) {
  return (
    <>
      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<MessageSquareHeart className="h-4 w-4 text-[#a2dd00]" />}
            label={hasFilters ? 'Total (filtrado)' : 'Total'}
            value={stats.total.toLocaleString('pt-BR')}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-[#a2dd00]" />}
            label="NPS Score"
            value={stats.npsScore !== null ? `${stats.npsScore}` : '—'}
            hint={`${stats.promoters} promotores · ${stats.detractors} detratores`}
          />
          <StatCard
            icon={<TrendingDown className="h-4 w-4 text-amber-400" />}
            label="NPS médio"
            value={stats.avgNps !== null ? stats.avgNps.toFixed(1) : '—'}
          />
          <StatCard
            icon={<Star className="h-4 w-4 text-[#a2dd00]" />}
            label="Rating médio"
            value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : '—'}
          />
        </div>
      )}

      {pageItems.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f3f0ed]/10 py-20 text-center">
          <MessageSquareHeart className="h-8 w-8 text-[#f3f0ed]/20" />
          <p className="text-sm text-[#f3f0ed]/40">
            {allCount === 0 ? 'Nenhum feedback recebido ainda.' : 'Nenhum feedback corresponde aos filtros.'}
          </p>
          {hasFilters && allCount > 0 && (
            <button onClick={resetFilters} className="text-xs font-medium text-[#a2dd00]/80 transition-colors hover:text-[#a2dd00]">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {pageItems.map((f) => {
            const isOpen = expanded === f.id;
            return (
              <div
                key={f.id}
                className="overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] transition-colors hover:bg-[#f3f0ed]/[0.04]"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : f.id)}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left md:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3f0ed]/5 text-sm font-semibold text-[#f3f0ed]/60">
                    {f.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.user.avatarUrl} alt={f.user.name} className="h-full w-full object-cover" />
                    ) : (
                      f.user.name?.charAt(0)?.toUpperCase() ?? '?'
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#f3f0ed]">
                        {f.user.name || f.user.email}
                      </span>
                      {planBadge(f.user.plan)}
                    </div>
                    <p className="truncate text-xs text-[#f3f0ed]/40">{f.user.email}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#f3f0ed]/40">NPS</span>
                      {npsBadge(f.nps)}
                      <span className="ml-1 text-[#f3f0ed]/40">Rating</span>
                      {ratingStars(f.rating)}
                      <span className="ml-1 text-[#f3f0ed]/40">·</span>
                      <span className="text-[#f3f0ed]/60">{goalLabel(f.goal, f.goalOther)}</span>
                    </div>

                    {f.features.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.features.map((feat) => (
                          <span
                            key={feat}
                            className="rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/5 px-2 py-0.5 text-[10px] font-medium text-[#a2dd00]/80"
                          >
                            {featureLabel(feat)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                    <span className="text-[11px] text-[#f3f0ed]/40">{formatDate(f.createdAt)}</span>
                    {f.creditsAwarded > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#a2dd00]/70">
                        <Coins className="h-3 w-3" />
                        +{f.creditsAwarded.toLocaleString('pt-BR')}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-[#f3f0ed]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="grid gap-4 border-t border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] px-4 py-4 md:grid-cols-3 md:px-5">
                    <FreeTextBlock label="O que impressionou" body={f.highlight} />
                    <FreeTextBlock label="O que melhorar" body={f.improve} highlight />
                    <FreeTextBlock label="Feature wishlist" body={f.wishlist} />
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] px-3 py-2 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-xs text-[#f3f0ed]/40">Página {currentPage} de {totalPages}</span>
              <button
                onClick={() => setPage(() => Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
          : 'text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function StatCard({
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
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[#f3f0ed] tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-[#f3f0ed]/30">{hint}</div>}
    </div>
  );
}

function FreeTextBlock({
  label,
  body,
  highlight,
}: {
  label: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight ? 'border-[#a2dd00]/20 bg-[#a2dd00]/5' : 'border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02]'
      }`}
    >
      <div
        className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${
          highlight ? 'text-[#a2dd00]/80' : 'text-[#f3f0ed]/40'
        }`}
      >
        {label}
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#f3f0ed]/80">{body}</p>
    </div>
  );
}
