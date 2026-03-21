'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Plan } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const PLAN_ORDER = ['free', 'starter', 'pro', 'business'];

function formatPrice(priceCents: number) {
  if (priceCents === 0) return { main: 'Grátis', sub: null };
  const int = Math.floor(priceCents / 100);
  const cents = String(priceCents % 100).padStart(2, '0');
  return { main: `R$ ${int.toLocaleString('pt-BR')},${cents}`, sub: '/mês' };
}

function getPlanFeatures(plan: Plan): string[] {
  return [
    `${plan.creditsPerMonth.toLocaleString('pt-BR')} créditos/mês`,
    `Até ${plan.maxConcurrentGenerations} gerações simultâneas`,
    plan.hasWatermark ? null : 'Sem marca d\'água',
    plan.galleryRetentionDays ? `Galeria por ${plan.galleryRetentionDays} dias` : 'Galeria ilimitada',
    plan.hasApiAccess ? 'Acesso à API' : null,
  ].filter(Boolean) as string[];
}

export default function CreditosPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('creditos');
  const queryClient = useQueryClient();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  const changeMutation = useMutation({
    mutationFn: ({ planSlug, action }: { planSlug: string; action: 'upgrade' | 'downgrade' }) =>
      action === 'upgrade'
        ? api.subscriptions.upgrade(accessToken!, planSlug)
        : api.subscriptions.downgrade(accessToken!, planSlug),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      if (action === 'upgrade') {
        toast.success('Upgrade realizado', { description: 'Seu plano foi atualizado com sucesso.' });
      } else {
        toast.success('Downgrade agendado', { description: 'O novo plano entrará em vigor no próximo período.' });
      }
    },
    onError: (_, { action }) =>
      toast.error(action === 'upgrade' ? 'Erro ao fazer upgrade' : 'Erro ao fazer downgrade', {
        description: 'Tente novamente.',
      }),
    onSettled: () => setSubscribingSlug(null),
  });

  async function handleSubscribe(planSlug: string) {
    if (!accessToken || subscribingSlug) return;
    setSubscribingSlug(planSlug);
    const action = getPlanAction(planSlug);
    if (action === 'create') {
      try {
        const { checkoutUrl } = await api.subscriptions.create(accessToken, planSlug);
        window.location.href = checkoutUrl;
      } catch {
        setSubscribingSlug(null);
      }
    } else {
      changeMutation.mutate({ planSlug, action });
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

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const isLoading = authLoading || balanceLoading || plansLoading || profileLoading;

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

  const currentPlanSlug =
    (profile?.plan as Record<string, unknown> | null)?.slug as string | null ?? null;

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

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-10">

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

        {/* ── Plans ── */}
        {sortedPlans.length > 0 && (
          <div className="flex flex-col gap-8">

            {/* Heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-2xl font-bold text-[#f3f0ed]">
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
              className="grid items-stretch gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(sortedPlans.length, 4)}, minmax(0, 1fr))` }}
            >
              {sortedPlans.map((plan) => {
                const isCurrent = currentPlanSlug === plan.slug;
                const isFree = plan.priceCents === 0;
                const isPro = plan.slug === 'pro';
                const { main, sub } = formatPrice(plan.priceCents);
                const features = getPlanFeatures(plan);
                const isSubscribing = subscribingSlug === plan.slug;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                      isCurrent
                        ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
                        : isPro
                          ? 'border-[#f3f0ed]/20 bg-[#1f2a2d]'
                          : 'border-[#f3f0ed]/8 bg-[#1c2527]'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
                          <Sparkles className="h-2.5 w-2.5" />
                          SEU PLANO
                        </span>
                      </div>
                    )}

                    <p className="mt-3 text-sm font-bold text-[#f3f0ed]">{plan.name}</p>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className={`text-2xl font-bold tabular-nums ${isCurrent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
                        {main}
                      </span>
                      {sub && <span className="text-[11px] text-[#f3f0ed]/40">{sub}</span>}
                    </div>

                    <div className="my-4 h-px w-full bg-[#f3f0ed]/6" />

                    <ul className="flex flex-1 flex-col gap-2.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
                          <Check className={`mt-px h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'}`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {!isFree && (
                      <button
                        disabled={isCurrent || !!subscribingSlug}
                        onClick={() => handleSubscribe(plan.slug)}
                        className={`mt-5 flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
                          isCurrent
                            ? 'bg-[#a2dd00]/20 text-[#a2dd00]'
                            : isPro
                              ? 'border border-[#f3f0ed]/20 bg-transparent text-[#f3f0ed] hover:bg-[#f3f0ed]/8'
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
              Créditos extras comprados nunca expiram · Acumulam com os do plano
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
