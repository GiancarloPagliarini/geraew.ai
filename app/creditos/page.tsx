'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  ArrowLeft,
  Coins,
  Loader2,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Check,
  Star,
  Flame,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { CreditPackage } from '@/lib/api';

// Rough estimates: ~38 credits per high-quality image, ~62 per video
function getPerks(pkg: CreditPackage, isBest: boolean): string[] {
  const images = Math.floor(pkg.credits / 38);
  const videos = Math.floor(pkg.credits / 62);

  const perks = [
    `Até ${images} imagens em alta qualidade`,
    `Até ${videos} vídeos com movimento`,
    'Combinação livre entre mídias',
  ];

  if (pkg.credits >= 1000) {
    perks[2] = 'Equilíbrio entre imagens e vídeos';
  }
  if (pkg.credits >= 2000) {
    perks[2] = 'Produção intensa sem se preocupar';
  }
  if (isBest) {
    perks.push('Volume máximo para produção profissional');
  }

  return perks;
}

function getBadge(i: number, total: number): 'popular' | 'best' | null {
  if (total <= 1) return null;
  if (total === 2) return i === 1 ? 'best' : null;
  if (i === Math.floor(total / 2)) return 'popular';
  if (i === total - 1) return 'best';
  return null;
}

export default function CreditosPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('creditos');

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const isLoading = authLoading || balanceLoading || packagesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  const periodStart = balance
    ? new Date(balance.periodStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';
  const periodEnd = balance
    ? new Date(balance.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';

  const totalCredits = balance ? balance.totalCreditsAvailable + balance.planCreditsUsed : 0;
  const usagePercent = totalCredits > 0 ? (balance!.planCreditsUsed / totalCredits) * 100 : 0;

  const activePackages = (packages ?? [])
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const basePricePerCredit =
    activePackages.length > 0
      ? Math.max(...activePackages.map((p) => p.priceCents / p.credits))
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#f3f0ed]/7 px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-10">

        {/* ── Balance ── */}
        {balance && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#a2dd00]" />
              <h1 className="text-lg font-bold text-[#f3f0ed]">Seus créditos</h1>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-[#a2dd00]/25 bg-[#a2dd00]/6 p-5">
                <div className="flex items-center gap-2 text-[#a2dd00]/60">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.15em]">DISPONÍVEIS</span>
                </div>
                <p className="mt-3 text-4xl font-bold tabular-nums text-[#a2dd00]">
                  {balance.totalCreditsAvailable.toLocaleString('pt-BR')}
                </p>
                <div className="mt-4 flex gap-4 text-xs text-[#a2dd00]/50">
                  <span>{balance.planCreditsRemaining.toLocaleString('pt-BR')} do plano</span>
                  <span>{balance.bonusCreditsRemaining.toLocaleString('pt-BR')} bônus</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-5">
                <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.12em]">USADOS</span>
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-[#f3f0ed]">
                  {balance.planCreditsUsed.toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-5">
                <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.12em]">PERÍODO</span>
                </div>
                <p className="mt-3 text-sm font-medium text-[#f3f0ed]">
                  {periodStart}
                  <span className="text-[#f3f0ed]/30"> — </span>
                  {periodEnd}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-5 py-4">
              <div className="flex items-center justify-between text-xs text-[#f3f0ed]/40">
                <span className="font-medium">Consumo no período</span>
                <span>{usagePercent.toFixed(1)}% utilizado</span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#f3f0ed]/8">
                <div
                  className="h-full rounded-full bg-[#a2dd00] transition-all duration-700"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Packages ── */}
        {activePackages.length > 0 && (
          <div className="flex flex-col gap-8">

            {/* Heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold text-[#f3f0ed]">
                Escolha seu pacote de créditos
              </h2>
              <span className="rounded-full border border-[#f3f0ed]/10 px-4 py-1.5 text-xs text-[#f3f0ed]/50">
                Créditos extras nunca expiram
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-[#f3f0ed]/30">
                <Lock className="h-3 w-3" />
                Pagamento seguro via Pix ou Cartão
              </div>
            </div>

            {/* Cards */}
            <div
              className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(activePackages.length, 4)}, minmax(0, 1fr))` }}
            >
              {activePackages.map((pkg, i) => {
                const badge = getBadge(i, activePackages.length);
                const isPopular = badge === 'popular';
                const isBest = badge === 'best';
                const pricePerCredit = pkg.priceCents / pkg.credits;
                const savingsPct =
                  basePricePerCredit > 0
                    ? Math.round((1 - pricePerCredit / basePricePerCredit) * 100)
                    : 0;
                const perks = getPerks(pkg, isBest);
                const priceInt = Math.floor(pkg.priceCents / 100);
                const priceCents = String(pkg.priceCents % 100).padStart(2, '0');

                return (
                  <div
                    key={pkg.id}
                    className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${
                      isBest
                        ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
                        : isPopular
                          ? 'border-[#f3f0ed]/20 bg-[#1f2a2d]'
                          : 'border-[#f3f0ed]/8 bg-[#1c2527]'
                    }`}
                  >
                    {/* Badge */}
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="flex items-center gap-1 rounded-full border border-[#f3f0ed]/20 bg-[#1a2123] px-3 py-1 text-[10px] font-bold tracking-widest text-[#f3f0ed]">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          MAIS POPULAR
                        </span>
                      </div>
                    )}
                    {isBest && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
                          <Flame className="h-2.5 w-2.5" />
                          MELHOR VALOR
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-3 flex items-baseline gap-0.5">
                      <span className="text-sm font-bold text-[#f3f0ed]/60">R$</span>
                      <span className="text-3xl font-bold tabular-nums text-[#f3f0ed]">
                        {priceInt.toLocaleString('pt-BR')},{priceCents}
                      </span>
                    </div>

                    {/* Credits */}
                    <p className="mt-1 text-base font-bold text-[#f3f0ed]">
                      {pkg.credits.toLocaleString('pt-BR')} créditos
                    </p>

                    {/* Savings badge */}
                    {savingsPct > 0 && (
                      <span className="mt-1.5 w-fit rounded-full bg-[#a2dd00]/15 px-2 py-0.5 text-[10px] font-bold text-[#a2dd00]">
                        {savingsPct}% mais barato
                      </span>
                    )}

                    {/* Description */}
                    <p className="mt-3 text-xs leading-relaxed text-[#f3f0ed]/40">
                      Gera imagens e vídeos em alta qualidade.
                    </p>

                    {/* Divider */}
                    <div className="my-4 h-px w-full bg-[#f3f0ed]/6" />

                    {/* Perks */}
                    <ul className="flex flex-1 flex-col gap-2.5">
                      {perks.map((perk) => (
                        <li key={perk} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
                          <Check
                            className={`mt-px h-3.5 w-3.5 shrink-0 ${
                              isBest ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'
                            }`}
                          />
                          {perk}
                        </li>
                      ))}
                    </ul>

                    {/* Price per credit */}
                    <p className="mt-4 text-[11px] text-[#f3f0ed]/20">
                      R$ {(pricePerCredit / 100).toFixed(4).replace('.', ',')} por crédito
                    </p>

                    {/* CTA */}
                    <button
                      className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                        isBest
                          ? 'bg-[#a2dd00] text-[#1a2123] hover:brightness-110'
                          : isPopular
                            ? 'border border-[#f3f0ed]/20 bg-transparent text-[#f3f0ed] hover:bg-[#f3f0ed]/8'
                            : 'bg-[#f3f0ed]/8 text-[#f3f0ed] hover:bg-[#f3f0ed]/12'
                      }`}
                    >
                      Comprar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-[#f3f0ed]/20">
              Pagamento único · Sem assinatura · Créditos acumulam com os do plano
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
