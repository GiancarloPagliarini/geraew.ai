'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Loader2,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Check,
  Lock,
  AlertTriangle,
  Zap,
  Crown,
  Users,
  Shield,
  Flame,
  Video,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  PLAN_ORDER,
  PLAN_SUBTITLES,
  PLAN_GENERATIONS,
  PLAN_ORIGINAL_PRICES,
  PLAN_DISCOUNT_LABELS,
  PLAN_SOCIAL_PROOF,
  formatPrice,
  formatPriceRaw,
  getPlanFeatures,
} from '@/lib/plans';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';

export default function CreditosPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('creditos');
  const queryClient = useQueryClient();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);

  async function executeDowngrade(planSlug: string) {
    if (!accessToken) return;
    setIsDowngrading(true);
    try {
      await api.subscriptions.downgrade(accessToken, planSlug);
      toast.success('Downgrade agendado', {
        description: 'Seu plano será alterado na próxima renovação.',
      });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setPendingDowngradeSlug(null);
    } catch {
      toast.error('Erro ao fazer downgrade', { description: 'Tente novamente.' });
    } finally {
      setIsDowngrading(false);
    }
  }

  async function handleSubscribe(planSlug: string) {
    if (!accessToken || subscribingSlug) return;
    const action = getPlanAction(planSlug);

    if (action === 'downgrade') {
      setPendingDowngradeSlug(planSlug);
      return;
    }

    setSubscribingSlug(planSlug);

    try {

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
          onClick={() => router.push('/workspace')}
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

        {/* -- Free video generations banner -- */}
        {balance && balance.freeVeoGenerationsRemaining > 0 && (
          <div className="flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
              <Video className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-emerald-400">
                Gerações de Vídeo Gratuitas
              </span>
              <span className="text-xs text-[#f3f0ed]/50">
                {balance.freeVeoGenerationsRemaining} restante{balance.freeVeoGenerationsRemaining !== 1 ? 's' : ''} · Veo 3.1 Fast ou Quality · 1080p
              </span>
            </div>
            <span className="ml-auto text-2xl font-bold tabular-nums text-emerald-400">
              {balance.freeVeoGenerationsRemaining}
            </span>
          </div>
        )}

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
          <div id="plans-section" className="flex flex-col gap-10">

            {/* Heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-4 py-1.5">
                <Flame className="h-3.5 w-3.5 text-[#a2dd00]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]">Oferta por tempo limitado</span>
              </div>
              <h2 className="text-2xl font-bold text-[#f3f0ed] sm:text-3xl">
                Escolha seu plano e comece a criar
              </h2>
              <p className="max-w-md text-sm text-[#f3f0ed]/45">
                Mais de <span className="font-semibold text-[#f3f0ed]/70">2.400 criadores</span> já estão gerando conteúdo. Comece grátis e escale quando quiser.
              </p>
              <div className="mt-1 flex items-center gap-4 text-[11px] text-[#f3f0ed]/30">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Garantia de 7 dias
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Pagamento seguro
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Cancele quando quiser
                </span>
              </div>
            </div>

            {/* Cards — 3 top row + 2 bottom row centered */}
            {(() => {
              const topPlans = sortedPlans.slice(0, 3);
              const bottomPlans = sortedPlans.slice(3);

              function renderCard(plan: typeof sortedPlans[number]) {
                const isCurrent = currentPlanSlug === plan.slug;
                const isFree = plan.priceCents === 0;
                const isCreator = plan.slug === 'creator';
                const isPro = plan.slug === 'pro';
                const isStudio = plan.slug === 'studio';
                const { main, sub } = formatPrice(plan.priceCents);
                const features = getPlanFeatures(plan);
                const isSubscribing = subscribingSlug === plan.slug;
                const isDowngrade = !isCurrent && getPlanAction(plan.slug) === 'downgrade';
                const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];
                const originalPrice = PLAN_ORIGINAL_PRICES[plan.slug];
                const discountLabel = PLAN_DISCOUNT_LABELS[plan.slug];
                const socialProof = PLAN_SOCIAL_PROOF[plan.slug];

                const actionLabel = isCurrent
                  ? 'Plano ativo'
                  : isFree
                    ? 'Plano atual'
                    : { upgrade: 'Fazer upgrade', downgrade: 'Fazer downgrade', create: 'Começar agora' }[getPlanAction(plan.slug)];

                const PlanIcon = isStudio ? Crown : isPro ? Zap : isCreator ? Sparkles : isFree ? Users : Coins;

                return (
                  <div
                    key={plan.id}
                    className={`group relative flex flex-col rounded-[22px] border transition-all duration-300 ${isDowngrade
                      ? 'border-[#f3f0ed]/5 bg-[#1c2527]/60 opacity-40 pointer-events-none'
                      : isCurrent
                        ? 'border-[#f3f0ed]/25 bg-[#1e2325] ring-1 ring-[#f3f0ed]/10'
                        : isCreator
                          ? 'border-[#a2dd00]/30 bg-gradient-to-b from-[#1f2d20] to-[#1a2523] ring-1 ring-[#a2dd00]/15 shadow-[0_0_40px_rgba(162,221,0,0.08)] hover:shadow-[0_0_60px_rgba(162,221,0,0.12)]'
                          : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.12] hover:bg-[#1a1f21]'
                      }`}
                  >
                    {isCreator && !isDowngrade && (
                      <>
                        <div
                          className="pointer-events-none absolute -inset-px rounded-[22px]"
                          style={{ background: 'linear-gradient(180deg, rgba(162,221,0,0.15) 0%, rgba(162,221,0,0) 50%)' }}
                        />
                        <div
                          className="pointer-events-none absolute -top-[1px] left-8 right-8 h-[2px]"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(162,221,0,0.6), transparent)' }}
                        />
                      </>
                    )}

                    {isCurrent && !isCreator && (
                      <div
                        className="pointer-events-none absolute -inset-px rounded-[22px] opacity-40"
                        style={{ background: 'linear-gradient(180deg, rgba(243,240,237,0.06) 0%, rgba(243,240,237,0) 35%)' }}
                      />
                    )}

                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                        <div className="flex items-center gap-1.5 rounded-full bg-[#f3f0ed] px-4 py-1 shadow-[0_0_16px_rgba(243,240,237,0.15)]">
                          <Check className="h-3 w-3 text-[#1a2123]" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#1a2123]">Seu Plano</span>
                        </div>
                      </div>
                    )}

                    {isCreator && !isCurrent && (
                      <div className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                        <div className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] px-5 py-1.5 shadow-[0_0_30px_rgba(162,221,0,0.4)]">
                          <Flame className="h-3.5 w-3.5 text-[#141a1c]" />
                          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#141a1c]">Mais Popular</span>
                        </div>
                      </div>
                    )}

                    <div className="relative flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isCreator ? 'bg-[#a2dd00]/15' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.05]'
                          }`}>
                          <PlanIcon className={`h-4 w-4 ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/70' : 'text-[#f3f0ed]/40'}`} />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-bold text-[#f3f0ed]">{plan.name}</h3>
                          {PLAN_SUBTITLES[plan.slug] && (
                            <span className="text-[10px] text-[#f3f0ed]/30">{PLAN_SUBTITLES[plan.slug]}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 min-h-[60px]">
                        {originalPrice && !isFree && (
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-[12px] text-[#f3f0ed]/25 line-through">{formatPriceRaw(originalPrice)}</span>
                            {discountLabel && (
                              <span className="rounded-md bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#a2dd00]">{discountLabel}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-baseline gap-0.5">
                          <span className={`text-[22px] font-extrabold leading-none tracking-tight ${isFree ? 'text-[#a2dd00]' : isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
                            }`}>{main}</span>
                          {sub && <span className="text-[11px] text-[#f3f0ed]/30">{sub}</span>}
                        </div>
                      </div>

                      <div className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 ${isCreator ? 'bg-[#a2dd00]/10 border border-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.03] border border-[#f3f0ed]/[0.05]'
                        }`}>
                        <Coins className={`h-4 w-4 ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
                        <div>
                          <span className={`text-[16px] font-extrabold tabular-nums ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
                            {isFree ? plan.creditsPerMonth : plan.creditsPerMonth.toLocaleString('pt-BR')}
                          </span>
                          <span className="ml-1.5 text-[11px] text-[#f3f0ed]/30">créditos{isFree ? '' : '/mês'}</span>
                        </div>
                      </div>

                      {socialProof && !isDowngrade && (
                        <p className="mt-3 text-[11px] font-medium text-[#a2dd00]/70">{socialProof}</p>
                      )}

                      <div className="my-4 h-px w-full bg-[#f3f0ed]/[0.06]" />

                      <ul className="flex min-h-[110px] flex-col gap-2.5">
                        {features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <div className={`mt-[2px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ${isCreator ? 'bg-[#a2dd00]/20' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.06]'
                              }`}>
                              <Check className={`h-2.5 w-2.5 ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/60' : 'text-[#f3f0ed]/45'}`} />
                            </div>
                            <span className="text-[12px] leading-snug text-[#f3f0ed]/55">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-4 flex min-h-[100px] flex-col gap-1.5">
                        {generationExamples.length > 0 && (
                          <>
                            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/20">O que dá pra criar</p>
                            {generationExamples.map((ex) => (
                              <div key={ex.label} className="flex items-center justify-between">
                                <span className="text-[10px] text-[#f3f0ed]/35">{ex.label}</span>
                                <span className={`text-[10px] font-semibold ${isCreator ? 'text-[#a2dd00]/60' : isCurrent ? 'text-[#f3f0ed]/55' : 'text-[#f3f0ed]/45'}`}>{ex.count}</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>

                      <div className="flex-1" />

                      {!isFree && !isDowngrade && (
                        <button
                          disabled={isCurrent || !!subscribingSlug}
                          onClick={() => handleSubscribe(plan.slug)}
                          className={`mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${isCurrent
                            ? 'bg-[#f3f0ed]/10 text-[#f3f0ed]/60'
                            : isCreator
                              ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_4px_20px_rgba(162,221,0,0.3)] hover:shadow-[0_4px_30px_rgba(162,221,0,0.4)] hover:brightness-110'
                              : 'border border-[#f3f0ed]/[0.1] bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/80 hover:border-[#f3f0ed]/[0.2] hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]'
                            }`}
                        >
                          {isSubscribing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {actionLabel}
                              {!isCurrent && <ArrowRight className="h-3.5 w-3.5" />}
                            </>
                          )}
                        </button>
                      )}

                      {/* {isCreator && !isCurrent && !isDowngrade && (
                        <p className="mt-2.5 text-center text-[10px] text-[#f3f0ed]/25">
                          Preço promocional · Pode aumentar a qualquer momento
                        </p>
                      )} */}
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                    {topPlans.map(renderCard)}
                  </div>
                  {bottomPlans.length > 0 && (
                    <div className="mx-auto grid w-full max-w-[calc(66.666%+0.5rem)] grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:gap-4">
                      {bottomPlans.map(renderCard)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Trust bar */}
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#f3f0ed]/25">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-[#a2dd00]/50" />
                  Sem taxa de cancelamento
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-[#a2dd00]/50" />
                  Créditos renovam mensalmente
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-[#a2dd00]/50" />
                  Garantia de reembolso em 7 dias
                </span>
              </div>
              <p className="text-center text-[11px] text-[#f3f0ed]/15">
                Créditos extras comprados nunca expiram &middot; Acumulam com os do plano
              </p>
            </div>
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

      {/* Retention modal for downgrade */}
      {pendingDowngradeSlug && (() => {
        const allPlans = (plans ?? []).slice().sort(
          (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
        );
        const currentPlan = allPlans.find((p) => p.slug === currentPlanSlug);
        const targetPlan = allPlans.find((p) => p.slug === pendingDowngradeSlug);
        const currentFeatures = currentPlan ? getPlanFeatures(currentPlan) : [];
        const targetFeatures = targetPlan ? getPlanFeatures(targetPlan) : [];
        const lostBenefits = currentFeatures.filter((f) => !targetFeatures.includes(f));
        if (currentPlan && targetPlan) {
          const creditDiff = currentPlan.creditsPerMonth - targetPlan.creditsPerMonth;
          if (creditDiff > 0) {
            lostBenefits.unshift(`${creditDiff.toLocaleString('pt-BR')} créditos mensais a menos`);
          }
        }
        return (
          <CancelRetentionModal
            action="downgrade"
            onClose={() => setPendingDowngradeSlug(null)}
            onConfirm={() => executeDowngrade(pendingDowngradeSlug)}
            isLoading={isDowngrading}
            currentPlanName={currentPlan?.name}
            targetPlanName={targetPlan?.name}
            lostBenefits={lostBenefits.length > 0 ? lostBenefits : ['Créditos e funcionalidades do plano atual']}
          />
        );
      })()}
    </div>
  );
}
