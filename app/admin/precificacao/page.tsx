'use client';

import { useAuth } from '@/lib/auth-context';
import { api, type PricingConfig, type PricingReport, type PricingFinance } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2, RefreshCw, FileDown, DollarSign, Users, TrendingDown, TrendingUp, Wallet,
  Coins, Activity, Pencil, Save, X, Megaphone, Film, Mic, User, Layers,
  AlertTriangle, Image as ImageIcon,
} from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

// ─── formatters ─────────────────────────────────────────────────────────────
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCents = (c: number) => brl((c ?? 0) / 100);
const int = (n: number) => (n ?? 0).toLocaleString('pt-BR');
const pct1 = (n: number) => `${(n ?? 0).toFixed(1)}%`;
const usd = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

function mrrBreakdown(f: PricingFinance): string {
  if (!f.mrrByCurrency?.length) return `ARPU ${brlCents(f.arpuCents)}`;
  return f.mrrByCurrency
    .map((c) => {
      const v = c.nativeCents / 100;
      if (c.currency === 'BRL') return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
      if (c.currency === 'USD') return `US$ ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      if (c.currency === 'EUR') return `€ ${v.toLocaleString('de-DE', { maximumFractionDigits: 0 })}`;
      return `${c.currency} ${v.toFixed(0)}`;
    })
    .join(' + ');
}

const TYPE_LABELS: Record<string, string> = {
  IMAGE_TO_IMAGE: 'Editar imagem', TEXT_TO_IMAGE: 'Texto→Imagem',
  IMAGE_TO_VIDEO: 'Imagem→Vídeo', TEXT_TO_VIDEO: 'Texto→Vídeo',
  REFERENCE_VIDEO: 'Vídeo de referência', MOTION_CONTROL: 'Motion Control',
  FACE_SWAP: 'Face Swap', VIRTUAL_TRY_ON: 'Virtual Try-On',
  VOICE_CLONE: 'Clonagem de voz', SPOKEN_VIDEO: 'Vídeo falado', AVATAR_VIDEO: 'Avatar',
};
const GROUP_META: Record<string, { label: string; icon: React.ElementType }> = {
  video: { label: 'Vídeo', icon: Film },
  image: { label: 'Imagem', icon: ImageIcon },
  motion: { label: 'Motion', icon: Activity },
  avatar: { label: 'Avatar', icon: User },
  voice: { label: 'Voz', icon: Mic },
};

const DELIVERY_ICONS: Record<string, React.ElementType> = {
  Imagem: ImageIcon,
  'Vídeo': Film,
  'Motion Control': Activity,
  Avatar: User,
  'Voz / Áudio': Mic,
};

function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#f3f0ed] md:text-lg">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#f3f0ed]/40">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/30 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 text-[#f3f0ed]/80 ${className}`}>{children}</td>;
}

export default function PrecificacaoPage() {
  const { accessToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<PricingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'precificacao'],
    queryFn: () => api.admin.pricingReport(accessToken!),
    enabled: !!accessToken,
  });

  const handleRefresh = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    setStatusMsg(null);
    try {
      await api.admin.pricingRefresh(accessToken);
      await refetch();
      setStatusMsg('Dados atualizados.');
    } catch {
      setStatusMsg('Falha ao atualizar.');
    } finally {
      setRefreshing(false);
    }
  };

  const startEdit = (r: PricingReport) => { setDraft(structuredClone(r.config)); setEditMode(true); setStatusMsg(null); };
  const cancelEdit = () => { setEditMode(false); setDraft(null); };
  const handleSave = async () => {
    if (!accessToken || !draft) return;
    setSaving(true);
    try {
      await api.admin.pricingSaveConfig(accessToken, draft);
      await refetch();
      setEditMode(false);
      setDraft(null);
      setStatusMsg('Configuração salva.');
    } catch {
      setStatusMsg('Falha ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const r = data;
  const f = r.finance;
  const c = r.consumption;
  const cfg = editMode && draft ? draft : r.config;

  const setCfg = (patch: Partial<PricingConfig>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <div id="precificacao-report" className="space-y-6">
      {/* Print styles — paisagem + cores legíveis (tema é dark) */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          aside { display: none !important; }
          main { margin: 0 !important; width: 100% !important; }
          .no-print { display: none !important; }
          body { background: #fff !important; }
          #precificacao-report, #precificacao-report * {
            color: #111 !important;
            background: transparent !important;
            border-color: #d4d4d4 !important;
            box-shadow: none !important;
          }
          #precificacao-report section, #precificacao-report .rounded-2xl, #precificacao-report .rounded-xl {
            border: 1px solid #d4d4d4 !important;
            break-inside: avoid;
          }
          #precificacao-report th, #precificacao-report td {
            border-bottom: 1px solid #e5e5e5 !important;
          }
          #precificacao-report input { border: none !important; padding: 0 !important; }

          /* KPIs: garante 5 colunas e impede que os números grandes transbordem/sobreponham */
          .kpi-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }
          .kpi-grid > div { padding: 8px !important; overflow: hidden; }
          .kpi-grid p { line-height: 1.2 !important; }
          .kpi-grid p.tabular-nums {
            font-size: 15px !important;
            white-space: nowrap !important;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">Precificação</h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/40">
            Custos, métricas e unit economics — atualizado em {new Date(r.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          {statusMsg && <span className="text-xs text-[#f3f0ed]/50">{statusMsg}</span>}
          {!editMode ? (
            <>
              <button onClick={() => startEdit(r)} className="flex h-9 items-center gap-2 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 px-3.5 text-sm font-semibold text-[#f3f0ed]/80 transition-colors hover:bg-[#f3f0ed]/10">
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 px-3.5 text-sm font-semibold text-[#f3f0ed]/80 transition-colors hover:bg-[#f3f0ed]/10 disabled:opacity-40">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
              </button>
              <button onClick={() => window.print()} className="flex h-9 items-center gap-2 rounded-xl border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3.5 text-sm font-semibold text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20">
                <FileDown className="h-4 w-4" /> Gerar PDF
              </button>
            </>
          ) : (
            <>
              <button onClick={cancelEdit} className="flex h-9 items-center gap-2 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 px-3.5 text-sm font-semibold text-[#f3f0ed]/80 transition-colors hover:bg-[#f3f0ed]/10">
                <X className="h-4 w-4" /> Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex h-9 items-center gap-2 rounded-xl border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3.5 text-sm font-semibold text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20 disabled:opacity-40">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="MRR (estimado)" value={f ? brlCents(f.mrrCents) : '—'} icon={DollarSign} accent sub={f ? mrrBreakdown(f) : 'Stripe indisponível'} />
        <StatCard label="Clientes pagantes" value={f ? int(f.payingCustomers) : '—'} icon={Users} sub={f ? `ARPU ${brlCents(f.arpuCents)}` : undefined} />
        <StatCard label="Em atraso" value={f ? int(f.pastDueCustomers) : '—'} icon={AlertTriangle} sub={f ? `${brlCents(f.pastDueMrrCents)} em risco` : undefined} />
        <StatCard label="Churn mensal" value={f ? pct1(f.churnRateMonthly * 100) : '—'} icon={TrendingDown} sub={f ? `Vida média ${f.ltvMonths.toFixed(1)} meses` : undefined} />
        <StatCard label="LTV" value={f ? brlCents(f.ltvCents) : '—'} icon={Wallet} sub={f ? `Margem ${pct1(f.marginLast30d * 100)}` : undefined} />
      </div>
      {f && (
        <p className="-mt-3 text-[11px] text-[#f3f0ed]/35">
          MRR combinado convertendo USD a R$ {f.mrrExchangeRateUsd.toFixed(2)}/US$ (ajuste o câmbio em &quot;Editar&quot;).
          A Stripe usa câmbio interno próprio, então o número do dashboard dela é a referência canônica.
        </p>
      )}

      {/* 1. Ferramentas por entrega */}
      <Section title="Ferramentas por tipo de entrega" subtitle="Modelos de IA usados por tipo de conteúdo">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cfg.toolsByDelivery.map((t) => {
            const Icon = DELIVERY_ICONS[t.delivery] ?? Layers;
            return (
              <div key={t.delivery} className="rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-[#f3f0ed]">
                  <Icon className="h-4 w-4 text-[#a2dd00]" /> {t.delivery}
                </p>
                <ul className="mt-2 space-y-1">
                  {t.tools.map((tool) => <li key={tool} className="text-xs text-[#f3f0ed]/50">• {tool}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 2. Custo real por geração */}
      <Section
        title="Custo real por geração (fornecedores)"
        subtitle={`Câmbio R$ ${cfg.exchangeRate.toFixed(2)}/US$ · vídeo ${cfg.videoSeconds}s · motion ${cfg.motionSeconds}s · 100% pay-as-you-go`}
        right={<div className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/5 px-2.5 py-1 text-[10px] font-semibold text-[#f3f0ed]/40"><Coins className="h-3 w-3" /> 1 crédito KIE = {usd(cfg.kieCreditUsd)}</div>}
      >
        {editMode && draft && (
          <div className="no-print mb-4 grid grid-cols-2 gap-3 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/5 p-4 md:grid-cols-4">
            <EditNum label="Câmbio R$/US$" value={draft.exchangeRate} onChange={(v) => setCfg({ exchangeRate: v })} step={0.01} />
            <EditNum label="Custo blended/crédito" value={draft.blendedCostPerCreditBRL} onChange={(v) => setCfg({ blendedCostPerCreditBRL: v })} step={0.0001} />
            <EditNum label="Vídeo (s)" value={draft.videoSeconds} onChange={(v) => setCfg({ videoSeconds: v })} step={1} />
            <EditNum label="Motion (s)" value={draft.motionSeconds} onChange={(v) => setCfg({ motionSeconds: v })} step={1} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-[#f3f0ed]/6">
              <Th>Grupo</Th><Th>Modelo</Th><Th>Provedor</Th><Th>Variação</Th><Th>Unidade</Th>
              <Th className="text-right">USD</Th><Th className="text-right">BRL</Th><Th className="text-right">Ex. clipe</Th>
            </tr></thead>
            <tbody>
              {r.costs.aiCosts.map((row, i) => (
                <tr key={i} className="border-b border-[#f3f0ed]/[0.04]">
                  <Td className="text-xs">
                    {(() => {
                      const meta = GROUP_META[row.group];
                      const GIcon = meta?.icon ?? Layers;
                      return (
                        <span className="flex items-center gap-1.5 whitespace-nowrap text-[#f3f0ed]/60">
                          <GIcon className="h-3.5 w-3.5 text-[#f3f0ed]/40" /> {meta?.label ?? row.group}
                        </span>
                      );
                    })()}
                  </Td>
                  <Td className="font-medium text-[#f3f0ed]">{row.model}</Td>
                  <Td className="text-xs text-[#f3f0ed]/50">{row.provider}</Td>
                  <Td className="text-xs">{row.variant}</Td>
                  <Td className="text-xs text-[#f3f0ed]/50">{row.unit}</Td>
                  <Td className="text-right tabular-nums">
                    {editMode && draft
                      ? <input type="number" step={0.0001} value={draft.aiCosts[i]?.usd ?? row.usd}
                          onChange={(e) => { const v = parseFloat(e.target.value) || 0; setDraft((d) => { if (!d) return d; const a = [...d.aiCosts]; a[i] = { ...a[i], usd: v }; return { ...d, aiCosts: a }; }); }}
                          className="w-20 rounded-md border border-[#f3f0ed]/10 bg-[#0d1011] px-2 py-1 text-right text-xs text-[#f3f0ed]" />
                      : usd(row.usd)}
                  </Td>
                  <Td className="text-right tabular-nums text-[#f3f0ed]/60">{brl(row.brl)}</Td>
                  <Td className="text-right tabular-nums font-medium">{row.exampleBRL !== null ? brl(row.exampleBRL) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MiniList title="Mais baratas" icon={TrendingDown} iconClass="text-[#a2dd00]" items={r.costs.cheapest.map((x) => ({ k: `${x.model} ${x.variant}`, v: brl(x.exampleBRL ?? x.brl) }))} />
          <MiniList title="Mais caras" icon={TrendingUp} iconClass="text-[#ef4444]" items={r.costs.mostExpensive.map((x) => ({ k: `${x.model} ${x.variant}`, v: brl(x.exampleBRL ?? x.brl) }))} />
        </div>
      </Section>

      {/* 3. Custos fixos + equipe + aquisição */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Custos fixos / mês" subtitle="Infraestrutura (fora as IAs)">
          <table className="w-full text-sm">
            <tbody>
              {cfg.infra.map((row, i) => (
                <tr key={i} className="border-b border-[#f3f0ed]/[0.04]">
                  <Td><span className="font-medium text-[#f3f0ed]">{row.name}</span>{row.note && <span className="block text-[10px] text-[#f3f0ed]/30">{row.note}</span>}</Td>
                  <Td className="text-right tabular-nums">
                    {editMode && draft
                      ? <input type="number" step={0.01} value={draft.infra[i]?.monthlyBRL ?? row.monthlyBRL}
                          onChange={(e) => { const v = parseFloat(e.target.value) || 0; setDraft((d) => { if (!d) return d; const a = [...d.infra]; a[i] = { ...a[i], monthlyBRL: v }; return { ...d, infra: a }; }); }}
                          className="w-24 rounded-md border border-[#f3f0ed]/10 bg-[#0d1011] px-2 py-1 text-right text-xs text-[#f3f0ed]" />
                      : brl(row.monthlyBRL)}
                  </Td>
                </tr>
              ))}
              <tr><Td className="font-bold text-[#f3f0ed]">Total</Td><Td className="text-right font-bold tabular-nums text-[#a2dd00]">{brl(r.costs.infraTotalBRL)}</Td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="Equipe" subtitle="Operação">
          <div className="space-y-3 text-sm">
            <Row icon={Users} k="Pessoas" v={String(cfg.team.people)} />
            <Row icon={Wallet} k="Custo de equipe" v={cfg.team.monthlyCostBRL === 0 ? 'R$ 0,00' : brl(cfg.team.monthlyCostBRL)} />
            <Row icon={Activity} k="Manutenção" v={`~${cfg.team.hoursPerDay}h/dia`} />
          </div>
        </Section>

        <Section title="Aquisição" subtitle="Canais">
          <div className="space-y-3 text-sm">
            <Row icon={Megaphone} k="Canal" v={cfg.acquisition.channel} />
            <Row icon={Wallet} k="CAC" v={cfg.acquisition.cacBRL === 0 ? '~R$ 0' : brl(cfg.acquisition.cacBRL)} />
          </div>
          <p className="mt-3 text-xs text-[#f3f0ed]/40">{cfg.acquisition.notes}</p>
        </Section>
      </div>

      {/* 4. Consumo por cliente */}
      <Section title="Consumo por cliente" subtitle={`Créditos GeraEW nos últimos 30 dias · ${int(c.payingUsers)} pagantes`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Mini k="Cliente normal (p50)" v={int(c.normalP50)} />
          <Mini k="Média" v={int(c.mean)} />
          <Mini k="p75" v={int(c.p75)} />
          <Mini k="Usa muito (p90)" v={int(c.heavyP90)} accent />
          <Mini k="p95" v={int(c.p95)} />
          <Mini k="Whale (máx)" v={int(c.max)} accent />
        </div>
        <p className="mt-3 text-xs text-[#f3f0ed]/40">Mediana de {int(c.gensMedian)} gerações/mês · {int(c.zeroConsumo)} pagantes sem consumo em 30d.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr className="border-b border-[#f3f0ed]/6"><Th>Plano</Th><Th className="text-right">Assinantes</Th><Th className="text-right">Consumo médio</Th><Th className="text-right">Franquia</Th><Th className="text-right">% franquia</Th></tr></thead>
            <tbody>
              {c.perPlan.map((p) => (
                <tr key={p.plan} className="border-b border-[#f3f0ed]/[0.04]">
                  <Td className="font-medium text-[#f3f0ed] capitalize">{p.plan}</Td>
                  <Td className="text-right tabular-nums">{int(p.n)}</Td>
                  <Td className="text-right tabular-nums">{int(p.avgConsumo)}</Td>
                  <Td className="text-right tabular-nums text-[#f3f0ed]/50">{int(p.franquia)}</Td>
                  <Td className={`text-right tabular-nums font-semibold ${(p.pctFranquia ?? 0) > 100 ? 'text-[#ef4444]' : 'text-[#f3f0ed]/70'}`}>{p.pctFranquia !== null ? `${p.pctFranquia}%` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 5. Recursos mais usados vs mais caros */}
      <Section title="Recursos mais usados vs mais caros" subtitle={`Últimos 30 dias · ${int(r.features.totalGens)} gerações · ${int(r.features.totalCredits)} créditos`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-[#f3f0ed]/6"><Th>Recurso</Th><Th className="text-right">% gerações</Th><Th className="text-right">% créditos (≈custo)</Th><Th className="text-right">Usuários</Th><Th className="text-right">Créd./geração</Th></tr></thead>
            <tbody>
              {r.features.byType.map((row) => (
                <tr key={row.type} className="border-b border-[#f3f0ed]/[0.04]">
                  <Td className="font-medium text-[#f3f0ed]">{TYPE_LABELS[row.type] ?? row.type}</Td>
                  <Td className="text-right tabular-nums">{pct1(row.pctGens)}</Td>
                  <Td className={`text-right tabular-nums font-semibold ${row.pctCredits >= 20 ? 'text-[#ef4444]' : 'text-[#f3f0ed]/70'}`}>{pct1(row.pctCredits)}</Td>
                  <Td className="text-right tabular-nums text-[#f3f0ed]/50">{int(row.usuarios)}</Td>
                  <Td className="text-right tabular-nums">{int(row.creditsPerGen)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <p className="no-print pb-4 text-center text-[10px] text-[#f3f0ed]/20">
        Métricas financeiras via Stripe (cache 5 min, botão Atualizar). Consumo e recursos ao vivo do banco. Custos editáveis em "Editar".
      </p>
    </div>
  );
}

function EditNum({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a2dd00]/60">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="rounded-md border border-[#f3f0ed]/10 bg-[#0d1011] px-2 py-1.5 text-sm text-[#f3f0ed]" />
    </label>
  );
}

function Row({ icon: Icon, k, v }: { icon: React.ElementType; k: string; v: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[#f3f0ed]/50"><Icon className="h-4 w-4 text-[#f3f0ed]/30" /> {k}</span>
      <span className="font-semibold text-[#f3f0ed]">{v}</span>
    </div>
  );
}

function Mini({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'border-[#a2dd00]/20 bg-[#a2dd00]/5' : 'border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#f3f0ed]/30">{k}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${accent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>{v}</p>
    </div>
  );
}

function MiniList({ title, icon: Icon, iconClass, items }: { title: string; icon: React.ElementType; iconClass: string; items: { k: string; v: string }[] }) {
  return (
    <div className="rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#f3f0ed]/60">
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} /> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between text-xs">
            <span className="text-[#f3f0ed]/60">{it.k}</span>
            <span className="font-semibold tabular-nums text-[#f3f0ed]/80">{it.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
