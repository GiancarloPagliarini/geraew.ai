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
  Gift,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const isLoading = authLoading || balanceLoading || packagesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && (
          <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>
        )}
      </div>
    );
  }

  const periodStart = balance
    ? new Date(balance.periodStart).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : '';
  const periodEnd = balance
    ? new Date(balance.periodEnd).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : '';

  const totalCredits = balance
    ? balance.totalCreditsAvailable + balance.planCreditsUsed
    : 0;
  const usagePercent =
    totalCredits > 0 ? (balance!.planCreditsUsed / totalCredits) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#f3f0ed]/[0.07] px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
        {/* Title */}
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-[#a2dd00]" />
          <h1 className="text-xl font-bold text-[#f3f0ed]">Seus Créditos</h1>
        </div>

        {/* Balance overview */}
        {balance && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Total available */}
            <div className="rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/[0.06] p-5">
              <div className="flex items-center gap-2 text-[#a2dd00]/70">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-bold tracking-[0.15em]">
                  CRÉDITOS DISPONÍVEIS
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-[#a2dd00]">
                {balance.totalCreditsAvailable.toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Used */}
            <div className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-5">
              <div className="flex items-center gap-2 text-[#f3f0ed]/50">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-bold tracking-[0.15em]">
                  UTILIZADOS NO PERÍODO
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold text-[#f3f0ed]">
                {balance.planCreditsUsed.toLocaleString('pt-BR')}
              </p>
            </div>

            {/* Breakdown */}
            <div className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-5">
              <div className="flex items-center gap-2 text-[#f3f0ed]/50">
                <Zap className="h-4 w-4" />
                <span className="text-[10px] font-bold tracking-[0.15em]">
                  DETALHAMENTO
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#f3f0ed]/50">Créditos do plano</span>
                  <span className="font-medium text-[#f3f0ed]">
                    {balance.planCreditsRemaining.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#f3f0ed]/50">Créditos bônus</span>
                  <span className="font-medium text-[#f3f0ed]">
                    {balance.bonusCreditsRemaining.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Period */}
            <div className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-5">
              <div className="flex items-center gap-2 text-[#f3f0ed]/50">
                <CalendarDays className="h-4 w-4" />
                <span className="text-[10px] font-bold tracking-[0.15em]">
                  PERÍODO ATUAL
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-[#f3f0ed]">
                {periodStart} — {periodEnd}
              </p>
              {/* Usage bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f3f0ed]/10">
                <div
                  className="h-full rounded-full bg-[#a2dd00] transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#f3f0ed]/40">
                {usagePercent.toFixed(1)}% utilizado
              </p>
            </div>
          </div>
        )}

        {/* Packages */}
        {packages && packages.length > 0 && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#a2dd00]/70" />
              <h2 className="text-sm font-bold text-[#f3f0ed]">
                Comprar Créditos
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {packages
                .filter((p) => p.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((pkg, i) => {
                  const pricePerCredit = pkg.priceCents / pkg.credits;
                  const isBest = i === packages.length - 1;

                  return (
                    <div
                      key={pkg.id}
                      className={`relative flex flex-col rounded-xl border p-5 transition-all hover:border-[#a2dd00]/40 ${
                        isBest
                          ? 'border-[#a2dd00]/30 bg-[#a2dd00]/[0.06]'
                          : 'border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03]'
                      }`}
                    >
                      {isBest && (
                        <span className="absolute -top-2.5 left-4 rounded-full bg-[#a2dd00] px-2.5 py-0.5 text-[10px] font-bold text-[#1a2123]">
                          MELHOR VALOR
                        </span>
                      )}

                      <h3 className="text-sm font-bold text-[#f3f0ed]">
                        {pkg.name}
                      </h3>

                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-[#f3f0ed]">
                          R$ {(pkg.priceCents / 100).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#f3f0ed]/50">
                        <Coins className="h-3.5 w-3.5 text-[#a2dd00]/60" />
                        {pkg.credits.toLocaleString('pt-BR')} créditos
                      </div>

                      <p className="mt-1 text-[11px] text-[#f3f0ed]/30">
                        R$ {(pricePerCredit / 100).toFixed(4).replace('.', ',')} por crédito
                      </p>

                      <button className="mt-4 flex h-9 items-center justify-center rounded-lg bg-[#a2dd00] text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]">
                        Comprar
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
