'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Instagram, Loader2, PenLine, PieChart, Phone, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, type AudienceInsights } from '@/lib/api';

// ─── Rótulos (espelham users.constants.ts da API) ────────────────────────────

const PROFILE_TYPE_LABELS: Record<string, string> = {
  SELLER: 'Vende produtos online',
  AFFILIATE: 'Afiliado / infoprodutos',
  PHOTOGRAPHER: 'Fotógrafo de produtos',
  SOCIAL_MEDIA: 'Social media / criador',
  BRAND_AGENCY: 'Marca ou agência',
  AI_SERVICES: 'Vende serviços de IA',
  OTHER: 'Outro',
};

const NICHE_LABELS: Record<string, string> = {
  FASHION: 'Moda e vestuário',
  BEAUTY: 'Beleza e cosméticos',
  HEALTH: 'Saúde e suplementos',
  FITNESS: 'Fitness',
  HOME: 'Casa e decoração',
  ELECTRONICS: 'Eletrônicos e acessórios',
  PET: 'Pet',
  FOOD: 'Alimentos e bebidas',
  INFOPRODUCT: 'Infoprodutos e cursos',
  SERVICES: 'Serviços',
  OTHER: 'Outro',
};

const SALES_CHANNEL_LABELS: Record<string, string> = {
  TIKTOK_SHOP: 'TikTok Shop',
  SHOPEE: 'Shopee',
  MERCADO_LIVRE: 'Mercado Livre',
  AMAZON: 'Amazon',
  INSTAGRAM: 'Instagram',
  META_ADS: 'Meta Ads',
  OWN_STORE: 'Loja própria',
  WHATSAPP: 'WhatsApp',
  NOT_SELLING_YET: 'Ainda não vende',
};

const PERIODS = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 365, label: '12 meses' },
  { days: undefined, label: 'Tudo' },
] as const;

const num = (n: number) => n.toLocaleString('pt-BR');

function share(part: number, whole: number): string {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

// ─── Peças ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl border p-4 ${
        highlight
          ? 'border-[#a2dd00]/25 bg-[#a2dd00]/[0.06]'
          : 'border-[#f3f0ed]/[0.06] bg-[#161d1f]'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f3f0ed]/40">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span
        className={`text-2xl font-bold tabular-nums ${highlight ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}
      >
        {value}
      </span>
      {hint && <span className="text-[11px] text-[#f3f0ed]/35">{hint}</span>}
    </div>
  );
}

/**
 * Barras horizontais ranqueadas. Comprimento carrega a magnitude e o rótulo
 * carrega a identidade — por isso uma cor só, sem paleta categórica.
 * O valor sempre aparece como número ao lado, então nada depende da cor.
 */
function BarList({
  title,
  hint,
  rows,
  total,
  emptyLabel = 'Sem respostas no período',
}: {
  title: string;
  hint?: string;
  rows: { key: string; label: string; value: number }[];
  /** Base do percentual e da largura da barra. */
  total: number;
  emptyLabel?: string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-[#f3f0ed]">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">{hint}</p>}
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#f3f0ed]/30">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[13px] text-[#f3f0ed]/75">{row.label}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-[#f3f0ed]/45">
                  <span className="font-bold text-[#f3f0ed]">{num(row.value)}</span>
                  {' · '}
                  {share(row.value, total)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#f3f0ed]/[0.06]">
                <div
                  className="h-full rounded-full bg-[#a2dd00] transition-[width] duration-500"
                  style={{ width: max ? `${(row.value / max) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const TH = 'px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/35';

/** Conversão por segmento — três medidas por linha pedem tabela, não gráfico. */
function ConversionTable({
  title,
  hint,
  rows,
  labels,
  otherByText,
}: {
  title: string;
  hint: string;
  rows: { id: string; users: number; paidUsers: number }[];
  labels: Record<string, string>;
  otherByText: { text: string; users: number }[];
}) {
  const otherHint =
    otherByText.length > 0
      ? otherByText
          .slice(0, 3)
          .map((o) => o.text)
          .join(', ')
      : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
      <div className="border-b border-[#f3f0ed]/6 px-5 py-4">
        <h2 className="text-sm font-bold text-[#f3f0ed]">{title}</h2>
        <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">{hint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[#f3f0ed]/30">Sem respostas no período</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead className="bg-[#f3f0ed]/[0.02]">
              <tr>
                <th className={TH}>Segmento</th>
                <th className={`${TH} text-right`}>Usuários</th>
                <th className={`${TH} text-right`}>Pagantes</th>
                <th className={`${TH} text-right`}>Conversão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f0ed]/[0.04]">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#f3f0ed]/[0.02]">
                  <td className="px-4 py-3 text-[13px] text-[#f3f0ed]/80">
                    {labels[row.id] ?? row.id}
                    {row.id === 'OTHER' && otherHint && (
                      <span className="ml-2 text-[11px] text-[#f3f0ed]/30">({otherHint}…)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#f3f0ed]/70">
                    {num(row.users)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#f3f0ed]/70">
                    {num(row.paidUsers)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-[#a2dd00]">
                    {share(row.paidUsers, row.users)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Lista das respostas abertas de "Outro" — candidatas a virar opção fixa. */
function OtherAnswers({
  title,
  rows,
}: {
  title: string;
  rows: { text: string; users: number }[];
}) {
  return (
    <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-[#f3f0ed]">
        <PenLine className="h-3.5 w-3.5 text-[#a2dd00]" />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-[#f3f0ed]/30">Ninguém escolheu “Outro”</p>
      ) : (
        <ul className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto">
          {rows.map((row) => (
            <li
              key={row.text}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-[#f3f0ed]/[0.03] px-3 py-2"
            >
              <span className="min-w-0 break-words text-[13px] text-[#f3f0ed]/75">{row.text}</span>
              {row.users > 1 && (
                <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#a2dd00]">
                  ×{row.users}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Respostas por dia — série única, valor no hover (barra sem rótulo fixo). */
function DailyStrip({ rows }: { rows: { date: string; count: number }[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <section className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-[#f3f0ed]">Respostas por dia</h2>
        <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">
          Adoção do formulário — passe o mouse para ver a data e o total.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[#f3f0ed]/30">Nenhuma resposta ainda</p>
      ) : (
        <>
          <div className="flex h-28 items-end gap-[3px]">
            {rows.map((row) => (
              <div
                key={row.date}
                title={`${fmt(row.date)} · ${num(row.count)} ${row.count === 1 ? 'resposta' : 'respostas'}`}
                className="group relative min-w-[3px] flex-1 rounded-t-[4px] bg-[#a2dd00]/70 transition-colors hover:bg-[#a2dd00]"
                style={{ height: max ? `${Math.max((row.count / max) * 100, 4)}%` : '4%' }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[#f3f0ed]/30">
            <span>{fmt(rows[0].date)}</span>
            <span>pico: {num(max)}/dia</span>
            <span>{fmt(rows[rows.length - 1].date)}</span>
          </div>
        </>
      )}
    </section>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function AdminPublicoPage() {
  const { accessToken } = useAuth();
  const [days, setDays] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audience', days ?? 'all'],
    queryFn: () => api.admin.audienceInsights(accessToken!, days),
    enabled: !!accessToken,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#f3f0ed]">
          <PieChart className="h-5 w-5 text-[#a2dd00]" />
          Público
        </h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">
          Perfil, nicho, canais e contato — do formulário respondido no primeiro acesso.
        </p>
      </div>

      <div className="flex justify-end">
        <div className="flex gap-1 rounded-lg border border-[#f3f0ed]/[0.06] bg-[#161d1f] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === p.days
                  ? 'bg-[#a2dd00]/[0.12] text-[#a2dd00]'
                  : 'text-[#f3f0ed]/45 hover:text-[#f3f0ed]/70'
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
        <Dashboard data={data} />
      )}
    </div>
  );
}

function Dashboard({ data }: { data: AudienceInsights }) {
  const { totals } = data;

  const profileRows = data.profileTypes.map((r) => ({
    key: r.id,
    label: PROFILE_TYPE_LABELS[r.id] ?? r.id,
    value: r.users,
  }));
  const nicheRows = data.niches.map((r) => ({
    key: r.id,
    label: NICHE_LABELS[r.id] ?? r.id,
    value: r.users,
  }));
  const channelRows = data.channels.map((r) => ({
    key: r.id,
    label: SALES_CHANNEL_LABELS[r.id] ?? r.id,
    value: r.users,
  }));

  const cohortHint = data.periodDays
    ? `Cadastros dos últimos ${data.periodDays} dias`
    : 'Todo o histórico';

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs — número puro, sem gráfico */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Contas ativas"
          value={num(totals.activeUsers)}
          hint={cohortHint}
          icon={Users}
        />
        <StatCard
          label="Responderam"
          value={num(totals.answered)}
          hint={`${share(totals.answered, totals.activeUsers)} das contas`}
          highlight
        />
        <StatCard
          label="Pendentes"
          value={num(totals.pending)}
          hint="Verão o formulário no próximo acesso"
        />
        <StatCard
          label="Com WhatsApp"
          value={num(totals.withPhone)}
          hint={share(totals.withPhone, totals.activeUsers)}
          icon={Phone}
        />
        <StatCard
          label="Com Instagram"
          value={num(totals.withInstagram)}
          hint={share(totals.withInstagram, totals.activeUsers)}
          icon={Instagram}
        />
      </div>

      <DailyStrip rows={data.daily} />

      {/* distribuições */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BarList
          title="Quem são"
          hint={`Escolha única · base: ${num(totals.answered)} que responderam`}
          rows={profileRows}
          total={totals.answered}
        />
        <BarList
          title="Nichos"
          hint={`Escolha única · base: ${num(totals.answered)} que responderam`}
          rows={nicheRows}
          total={totals.answered}
        />
      </div>

      <BarList
        title="Onde vendem ou publicam"
        hint={`Múltipla escolha — a soma passa de 100%. Percentual sobre ${num(totals.answered)} que responderam.`}
        rows={channelRows}
        total={totals.answered}
      />

      {/* conversão por segmento */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ConversionTable
          title="Conversão por perfil"
          hint="Pagante = assinatura ativa em plano diferente de Free."
          rows={data.profileTypes}
          labels={PROFILE_TYPE_LABELS}
          otherByText={data.otherProfileTypes}
        />
        <ConversionTable
          title="Conversão por nicho"
          hint="Onde o produto já se paga — útil para escolher o próximo criativo."
          rows={data.niches}
          labels={NICHE_LABELS}
          otherByText={data.otherNiches}
        />
      </div>

      {/* respostas abertas */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <OtherAnswers title="“Outro” em perfil" rows={data.otherProfileTypes} />
        <OtherAnswers title="“Outro” em nicho" rows={data.otherNiches} />
      </div>
    </div>
  );
}
