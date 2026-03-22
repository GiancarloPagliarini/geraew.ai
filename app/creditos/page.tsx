'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  ArrowLeft,
  Coins,
  Loader2,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Check,
  Lock, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  PLAN_ORDER,
  PLAN_SUBTITLES,
  PLAN_GENERATIONS,
  formatPrice,
  getPlanFeatures,
} from '@/lib/plans';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';

export default function CreditosPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('creditos');
  const queryClient = useQueryClient();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  async function handleSubscribe(planSlug: string) {
    if (!accessToken || subscribingSlug) return;
    setSubscribingSlug(planSlug);
    const action = getPlanAction(planSlug);

    try {
      if (action === 'downgrade') {
        await api.subscriptions.downgrade(accessToken, planSlug);
        toast.success('Downgrade agendado', {
          description: 'Seu plano será alterado na próxima renovação.',
        });
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
        setSubscribingSlug(null);
        return;
      }

      let checkoutUrl: string;
      if (action === 'create') {
        const res = await api.subscriptions.create(accessToken, planSlug);
        checkoutUrl = res.checkoutUrl;
      } else {
        const res = await api.subscriptions.upgrade(accessToken, planSlug);
        checkoutUrl = res.checkoutUrl;
      }
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        try {
          const res = await api.subscriptions.upgrade(accessToken, planSlug);
          window.location.href = res.checkoutUrl;
        } catch {
          toast.error('Erro ao mudar de plano', { description: 'Tente novamente.' });
          setSubscribingSlug(null);
        }
      } else {
        toast.error('Erro ao mudar de plano', { description: 'Tente novamente.' });
        setSubscribingSlug(null);
      }
    }
  }

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const isLoading = authLoading || balanceLoading || plansLoading || profileLoading || packagesLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  const currentPlanSlug =
    (profile?.plan as Record<string, unknown> | null)?.slug as string | null ?? null;

  const isFreeUser = currentPlanSlug === 'free' || !currentPlanSlug;

  const periodStart = balance
    ? new Date(balance.periodStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';
  const periodEnd = balance
    ? new Date(balance.periodEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';

  const totalCredits = balance ? balance.totalCreditsAvailable + balance.planCreditsUsed : 0;
  const usagePercent = totalCredits > 0 ? (balance!.planCreditsUsed / totalCredits) * 100 : 0;

  const sub = profile?.subscription as Record<string, unknown> | null;
  const hasActiveSub = sub?.status === 'ACTIVE' || sub?.status === 'active';

  function getPlanAction(targetSlug: string): 'upgrade' | 'downgrade' | 'create' {
    if (!hasActiveSub || !currentPlanSlug || currentPlanSlug === 'free') return 'create';
    const currentIdx = PLAN_ORDER.indexOf(currentPlanSlug);
    const targetIdx = PLAN_ORDER.indexOf(targetSlug);
    return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
  }

  const sortedPlans = (plans ?? []).slice().sort(
    (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
  );

  // Low credits warning
  const creditsPercent = totalCredits > 0
    ? (balance!.totalCreditsAvailable / totalCredits) * 100
    : 100;
  const showLowCreditsBanner = !isFreeUser && creditsPercent > 0 && creditsPercent <= 20;
  const showZeroCreditsModal = !isFreeUser && balance && balance.totalCreditsAvailable === 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123] overflow-y-auto sidebar-scroll">
      {/* Zero credits modal */}
      {showZeroCreditsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[#f3f0ed]/10 bg-[#1c2527] p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle className="h-7 w-7 text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-[#f3f0ed]">Créditos esgotados</h3>
              <p className="mt-2 text-sm text-[#f3f0ed]/50">
                Renove seu plano ou compre um boost para continuar gerando.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <button
                onClick={() => {
                  const plansSection = document.getElementById('plans-section');
                  plansSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d]"
              >
                Renovar agora
              </button>
              <button
                onClick={() => {
                  const boostSection = document.getElementById('boost-section');
                  boostSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/15 text-sm font-medium text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/5"
              >
                Comprar créditos avulsos
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Low credits banner */}
      {showLowCreditsBanner && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/8 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300/80">
                Seus créditos estão acabando ({balance!.totalCreditsAvailable.toLocaleString('pt-BR')} restantes)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const boostSection = document.getElementById('boost-section');
                  boostSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-medium text-yellow-300/70 transition-colors hover:text-yellow-300"
              >
                Comprar Boost
              </button>
              <button
                onClick={() => {
                  const plansSection = document.getElementById('plans-section');
                  plansSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-bold text-[#a2dd00] transition-colors hover:text-[#b5e82d]"
              >
                Renovar plano
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10">

        {/* -- Balance -- */}
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
                <p className="mt-3 text-3xl font-bold tabular-nums text-[#a2dd00] sm:text-4xl">
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
                  {isFreeUser ? (
                    <span>Diário</span>
                  ) : (
                    <>
                      {periodStart}
                      <span className="text-[#f3f0ed]/30"> — </span>
                      {periodEnd}
                    </>
                  )}
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

        {/* -- Plans -- */}
        {sortedPlans.length > 0 && (
          <div id="plans-section" className="flex flex-col gap-8">

            {/* Heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-xl font-bold text-[#f3f0ed] sm:text-2xl">
                Escolha seu plano
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-[#f3f0ed]/40">
                <Coins className="h-3 w-3 text-[#a2dd00]" />
                Créditos do plano renovam mensalmente
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#f3f0ed]/30">
                <Lock className="h-3 w-3" />
                Pagamento seguro via Pix ou Cartão
              </div>
            </div>

            {/* Cards */}
            <div
              className="flex flex-col items-stretch gap-5 sm:grid sm:gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(sortedPlans.length, 5)}, minmax(0, 1fr))` }}
            >
              {sortedPlans.map((plan) => {
                const isCurrent = currentPlanSlug === plan.slug;
                const isFree = plan.priceCents === 0;
                const isCreator = plan.slug === 'creator';
                const { main, sub } = formatPrice(plan.priceCents);
                const features = getPlanFeatures(plan);
                const isSubscribing = subscribingSlug === plan.slug;
                const subtitle = PLAN_SUBTITLES[plan.slug];
                const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-5 transition-all ${isCurrent
                      ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
                      : isCreator
                        ? 'border-[#a2dd00]/30 bg-[#1f2a2d] shadow-[0_0_20px_rgba(162,221,0,0.05)]'
                        : 'border-[#f3f0ed]/8 bg-[#1c2527]'
                      }`}
                  >
                    {/* "Mais popular" badge */}
                    {isCreator && !isCurrent && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
                          <Sparkles className="h-2.5 w-2.5" />
                          MAIS POPULAR
                        </span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
                          <Sparkles className="h-2.5 w-2.5" />
                          SEU PLANO
                        </span>
                      </div>
                    )}

                    <p className="mt-3 text-sm font-bold text-[#f3f0ed]">{plan.name}</p>
                    {subtitle && (
                      <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">{subtitle}</p>
                    )}

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className={`text-2xl font-bold tabular-nums ${isCurrent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
                        {main}
                      </span>
                      {sub && <span className="text-[11px] text-[#f3f0ed]/40">{sub}</span>}
                    </div>

                    {!isFree && (
                      <p className="mt-1 text-[11px] text-[#f3f0ed]/30">
                        {plan.creditsPerMonth.toLocaleString('pt-BR')} créditos
                      </p>
                    )}

                    <div className="my-4 h-px w-full bg-[#f3f0ed]/6" />

                    {/* Plan features */}
                    <ul className="flex flex-col gap-2">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
                          <Check className={`mt-px h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Generation examples */}
                    {generationExamples.length > 0 && (
                      <>
                        <div className="my-3 h-px w-full bg-[#f3f0ed]/6" />
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[10px] font-bold tracking-[0.1em] text-[#f3f0ed]/25">GERAÇÕES</p>
                          {generationExamples.map((ex) => (
                            <div key={ex.label} className="flex items-center justify-between text-[11px]">
                              <span className="text-[#f3f0ed]/40">{ex.label}</span>
                              {ex.blocked ? (
                                <span className="flex items-center gap-1 text-red-400/60">
                                  <Lock className="h-2.5 w-2.5" />
                                  bloqueado
                                </span>
                              ) : (
                                <span className="font-medium text-[#f3f0ed]/60">{ex.count}</span>
                              )}
                            </div>
                          ))}
                          <p className="text-[10px] text-[#f3f0ed]/15 mt-1">Estimativa usando todos os créditos em um único modelo</p>
                        </div>
                      </>
                    )}

                    <div className="flex-1" />

                    {!isFree && (
                      <button
                        disabled={isCurrent || !!subscribingSlug}
                        onClick={() => handleSubscribe(plan.slug)}
                        className={`mt-5 flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${isCurrent
                          ? 'bg-[#a2dd00]/20 text-[#a2dd00]'
                          : isCreator
                            ? 'bg-[#a2dd00] text-[#1a2123] hover:bg-[#b5e82d]'
                            : 'bg-[#f3f0ed]/8 text-[#f3f0ed] hover:bg-[#f3f0ed]/12'
                          }`}
                      >
                        {isSubscribing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrent ? (
                          'Plano ativo'
                        ) : (
                          {
                            upgrade: 'Fazer upgrade',
                            downgrade: 'Fazer downgrade',
                            create: 'Assinar',
                          }[getPlanAction(plan.slug)]
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-[#f3f0ed]/20">
              Créditos extras comprados nunca expiram &middot; Acumulam com os do plano
            </p>
          </div>
        )}

        {/* -- Pacotes avulsos -- */}
        {packages && packages.length > 0 && (
          <div id="boost-section" className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="flex items-center gap-2 text-xl font-bold text-[#f3f0ed]">
                <Coins className="h-5 w-5 text-[#a2dd00]" />
                Pacotes de créditos
              </h2>
              <p className="text-xs text-[#f3f0ed]/40">
                Créditos extras que nunca expiram. Compre quando precisar.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-[#f3f0ed]/30">
                <Lock className="h-3 w-3" />
                Pagamento seguro via Pix ou Cartão
              </div>
            </div>

            <CreditPackagesGrid packages={packages} />

            <p className="text-center text-xs text-[#f3f0ed]/20">
              Pagamento único · Sem assinatura · Créditos acumulam com os do plano
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
