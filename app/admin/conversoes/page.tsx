'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, type UtmConversionRow, type UtmRequestRow } from '@/lib/api';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/plans';
import { parseUserAgent } from '@/lib/ua';
import { Loader2, TrendingUp, ChevronDown, Smartphone, Monitor } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
] as const;

function pct(customers: number, signups: number): string {
  if (!signups) return '—';
  return `${((customers / signups) * 100).toFixed(1)}%`;
}

function creativeLabel(row: UtmConversionRow): string {
  if (row.utmContent) return row.utmContent;
  if (!row.utmSource && !row.utmMedium && !row.utmCampaign) return '(direto / orgânico)';
  return '(sem criativo)';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(['pt-BR'], { type: 'region' });
} catch {
  regionNames = null;
}

/** Converte código ISO-2 (MX, BR) em "🇲🇽 México". */
function countryLabel(code: string | null): string {
  if (!code) return '—';
  const cc = code.toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return code;
  const flag = cc.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  const name = regionNames?.of(cc) ?? cc;
  return `${flag} ${name}`;
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#161d1f] p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f3f0ed]/40">{label}</span>
      <span className="text-2xl font-bold text-[#f3f0ed]">{value}</span>
      {hint && <span className="text-[11px] text-[#f3f0ed]/35">{hint}</span>}
    </div>
  );
}

const TH = 'px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/35';

export default function AdminConversoesPage() {
  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#f3f0ed]">
          <TrendingUp className="h-5 w-5 text-[#a2dd00]" />
          Conversões
        </h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">Atribuição por criativo e requisições detalhadas — direto do seu banco.</p>
      </div>

      <Tabs defaultValue="criativo">
        <TabsList variant="line" className="mb-2 w-full flex-wrap gap-1 border-b border-[#f3f0ed]/6 pb-1">
          <TabsTrigger
            value="criativo"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/40 hover:text-[#f3f0ed]/60 data-[state=active]:bg-[#a2dd00]/5 data-[state=active]:text-[#a2dd00] data-[state=active]:after:bg-[#a2dd00]"
          >
            Por criativo
          </TabsTrigger>
          <TabsTrigger
            value="requisicoes"
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/40 hover:text-[#f3f0ed]/60 data-[state=active]:bg-[#a2dd00]/5 data-[state=active]:text-[#a2dd00] data-[state=active]:after:bg-[#a2dd00]"
          >
            Requisições
          </TabsTrigger>
        </TabsList>

        <TabsContent value="criativo">
          <CreativesTab />
        </TabsContent>
        <TabsContent value="requisicoes">
          <RequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreativesTab() {
  const { accessToken } = useAuth();
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'utm-conversions', days],
    queryFn: () => api.admin.utmConversions(accessToken!, days),
    enabled: !!accessToken,
    refetchInterval: 60_000,
  });

  const totals = data?.totals;
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg border border-[#f3f0ed]/[0.06] bg-[#161d1f] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === p.days ? 'bg-[#a2dd00]/[0.12] text-[#a2dd00]' : 'text-[#f3f0ed]/45 hover:text-[#f3f0ed]/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Cadastros" value={totals!.signups.toLocaleString('pt-BR')} />
            <StatCard label="Clientes (pagaram)" value={totals!.customers.toLocaleString('pt-BR')} />
            <StatCard label="Conversão" value={pct(totals!.customers, totals!.signups)} hint="cadastro → pago" />
            <StatCard label="Receita" value={formatCurrency(totals!.revenueCents, 'BRL', 'pt-BR')} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#f3f0ed]/[0.06] bg-[#161d1f]">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#f3f0ed]/[0.06] text-left">
                  <th className={TH}>Criativo (utm_content)</th>
                  <th className={TH}>Origem</th>
                  <th className={TH}>Campanha</th>
                  <th className={`${TH} text-right`}>Cadastros</th>
                  <th className={`${TH} text-right`}>Clientes</th>
                  <th className={`${TH} text-right`}>Conv.</th>
                  <th className={`${TH} text-right`}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#f3f0ed]/35">Nenhum cadastro no período.</td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={`${row.utmContent}-${row.utmCampaign}-${row.utmSource}-${i}`} className="border-b border-[#f3f0ed]/[0.04] last:border-0 hover:bg-[#f3f0ed]/[0.02]">
                    <td className="px-4 py-3 font-medium text-[#f3f0ed]">{creativeLabel(row)}</td>
                    <td className="px-4 py-3 text-[#f3f0ed]/55">
                      {row.utmSource ?? '—'}
                      {row.utmMedium ? <span className="text-[#f3f0ed]/30"> / {row.utmMedium}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-[#f3f0ed]/55">{row.utmCampaign ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#f3f0ed]/70">{row.signups.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#f3f0ed]/70">{row.customers.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#f3f0ed]/55">{pct(row.customers, row.signups)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#a2dd00]">{formatCurrency(row.revenueCents, 'BRL', 'pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[#f3f0ed]/30">
            Coorte por data de cadastro · receita lifetime dos cadastros do período. Use <code className="text-[#f3f0ed]/50">utm_content={'{{ad.id}}'}</code> nos anúncios para ranquear por criativo.
          </p>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[#f3f0ed]/[0.04] px-4 py-2.5 last:border-0 sm:flex-row sm:gap-4">
      <span className="w-40 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#f3f0ed]/35">{label}</span>
      <span className={`min-w-0 break-words text-[13px] text-[#f3f0ed]/75 ${mono ? 'font-mono text-[12px]' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function RequestsTab() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState<number>(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 30;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'utm-requests', page],
    queryFn: () => api.admin.utmRequests(accessToken!, page, limit),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const maxPage = Math.max(1, Math.ceil(total / limit));

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-[#f3f0ed]/[0.06] bg-[#161d1f]">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[#f3f0ed]/[0.06] text-left">
              <th className={`${TH} w-8`}></th>
              <th className={TH}>Criado em</th>
              <th className={TH}>Usuário</th>
              <th className={TH}>Campanha</th>
              <th className={TH}>Página</th>
              <th className={TH}>Dispositivo</th>
              <th className={TH}>SO</th>
              <th className={TH}>Navegador</th>
              <th className={TH}>Local</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#f3f0ed]/35">Nenhuma requisição com atribuição ainda.</td>
              </tr>
            )}
            {rows.map((row) => {
              const ua = parseUserAgent(row.signupUserAgent);
              const open = expanded === row.id;
              return (
                <FragmentRow key={row.id} row={row} ua={ua} open={open} onToggle={() => setExpanded(open ? null : row.id)} />
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-[#f3f0ed]/45">
        <span>
          {from}–{to} de {total.toLocaleString('pt-BR')}
          {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-[#f3f0ed]/10 px-3 py-1.5 font-semibold transition-colors hover:bg-[#f3f0ed]/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="rounded-lg border border-[#f3f0ed]/10 px-3 py-1.5 font-semibold transition-colors hover:bg-[#f3f0ed]/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  ua,
  open,
  onToggle,
}: {
  row: UtmRequestRow;
  ua: ReturnType<typeof parseUserAgent>;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="cursor-pointer border-b border-[#f3f0ed]/[0.04] hover:bg-[#f3f0ed]/[0.02]" onClick={onToggle}>
        <td className="px-4 py-3">
          <ChevronDown className={`h-4 w-4 text-[#f3f0ed]/30 transition-transform ${open ? '' : '-rotate-90'}`} />
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-[#f3f0ed]/70">{fmtDate(row.createdAt)}</td>
        <td className="max-w-[180px] truncate px-4 py-3 text-[#f3f0ed]/70" title={row.email}>{row.email}</td>
        <td className="max-w-[200px] truncate px-4 py-3 text-[#f3f0ed]/55" title={row.utmCampaign ?? ''}>{row.utmCampaign ?? '—'}</td>
        <td className="max-w-[200px] truncate px-4 py-3 text-[#f3f0ed]/45" title={row.landingPage ?? ''}>{row.landingPage ?? '—'}</td>
        <td className="px-4 py-3 text-[#f3f0ed]/55">
          <span className="inline-flex items-center gap-1.5">
            {ua.device === 'Desktop' ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            {ua.device}
          </span>
        </td>
        <td className="px-4 py-3 text-[#f3f0ed]/55">{ua.os}</td>
        <td className="px-4 py-3 text-[#f3f0ed]/55">{ua.browser}</td>
        <td className="whitespace-nowrap px-4 py-3 text-[#f3f0ed]/55">{countryLabel(row.country)}</td>
      </tr>
      {open && (
        <tr className="border-b border-[#f3f0ed]/[0.06] bg-[#12181a]">
          <td colSpan={9} className="px-3 py-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-[#f3f0ed]/[0.06] bg-[#161d1f]">
                <DetailRow label="Usuário" value={`${row.name} · ${row.email}`} />
                <DetailRow label="Página" value={row.landingPage} mono />
                <DetailRow label="Dispositivo" value={ua.device} />
                <DetailRow label="Sistema Operacional" value={ua.os} />
                <DetailRow label="Navegador" value={ua.browser} />
                <DetailRow label="País" value={countryLabel(row.country)} />
                <DetailRow label="Referência" value={row.referrer} mono />
                <DetailRow label="IP" value={row.signupIp} mono />
              </div>
              <div className="rounded-lg border border-[#f3f0ed]/[0.06] bg-[#161d1f]">
                <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]/70">Parâmetros da URL</div>
                <DetailRow label="utm_source" value={row.utmSource} mono />
                <DetailRow label="utm_medium" value={row.utmMedium} mono />
                <DetailRow label="utm_campaign" value={row.utmCampaign} mono />
                <DetailRow label="utm_content" value={row.utmContent} mono />
                <DetailRow label="utm_term" value={row.utmTerm} mono />
                <DetailRow label="fbclid" value={row.fbclid} mono />
                <DetailRow label="gclid" value={row.gclid} mono />
                <DetailRow label="User agent" value={row.signupUserAgent} mono />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
