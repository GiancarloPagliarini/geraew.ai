'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Coins,
  Loader2,
  Lock,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Plan } from '@/lib/api';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import {
  PLAN_ORDER,
  PLAN_SUBTITLES,
  PLAN_GENERATIONS,
  formatPrice,
  getPlanFeatures,
} from '@/lib/plans';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  planAction: 'upgrade' | 'downgrade' | 'create' | 'current';
  onSubscribe: (slug: string) => void;
  subscribingSlug: string | null;
}

function PlanCard({ plan, isCurrent, planAction, onSubscribe, subscribingSlug }: PlanCardProps) {
  const isFree = plan.priceCents === 0;
  const isCreator = plan.slug === 'creator';
  const isHighlighted = isCurrent || isCreator;
  const { main, sub } = formatPrice(plan.priceCents);
  const isSubscribing = subscribingSlug === plan.slug;
  const features = getPlanFeatures(plan);
  const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];
  const isDowngrade = planAction === 'downgrade';
  const subtitle = PLAN_SUBTITLES[plan.slug];

  const actionLabel = {
    upgrade: 'Fazer upgrade',
    downgrade: 'Fazer downgrade',
    create: 'Assinar',
    current: 'Plano ativo',
  }[planAction];

  return (
    <div
      className={`group relative flex flex-col rounded-[20px] border transition-all duration-300 ${
        isDowngrade
          ? 'border-[#f3f0ed]/5 bg-[#1c2527]/60 opacity-40 pointer-events-none'
          : isCurrent
            ? 'border-[#a2dd00]/40 bg-[#1a2523]'
            : isCreator
              ? 'border-[#a2dd00]/25 bg-[#1a2523]'
              : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.1]'
      }`}
    >
      {/* Top glow line for highlighted cards */}
      {isHighlighted && !isDowngrade && (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-[20px] opacity-60"
            style={{
              background: 'linear-gradient(180deg, rgba(162,221,0,0.12) 0%, rgba(162,221,0,0) 40%)',
            }}
          />
          <div
            className="pointer-events-none absolute -top-[1px] left-6 right-6 h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(162,221,0,0.5), transparent)',
            }}
          />
        </>
      )}

      {/* Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] px-4 py-1 shadow-[0_0_20px_rgba(162,221,0,0.3)]">
            <Sparkles className="h-3 w-3 text-[#141a1c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#141a1c]">
              Seu Plano
            </span>
          </div>
        </div>
      )}
      {isCreator && !isCurrent && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] px-4 py-1 shadow-[0_0_20px_rgba(162,221,0,0.3)]">
            <Sparkles className="h-3 w-3 text-[#141a1c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#141a1c]">
              Mais Popular
            </span>
          </div>
        </div>
      )}

      {/* Card inner */}
      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        {/* Plan header */}
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-bold text-[#f3f0ed]">{plan.name}</h3>
          {subtitle && (
            <span className="rounded-md bg-[#f3f0ed]/[0.05] px-2 py-0.5 text-[9px] font-medium text-[#f3f0ed]/35">
              {subtitle}
            </span>
          )}
        </div>

        {/* Credits — hero number */}
        <div className="mt-4">
          <span
            className={`text-[36px] font-extrabold leading-none tracking-tight tabular-nums ${
              isCurrent || isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
            }`}
          >
            {isFree ? plan.creditsPerMonth : plan.creditsPerMonth.toLocaleString('pt-BR')}
          </span>
          <p className="mt-1 text-[12px] text-[#f3f0ed]/30">
            créditos{isFree ? ' para testar' : ' por mês'}
          </p>
        </div>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-1">
          <span className={`text-[17px] font-bold ${isFree ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/70'}`}>
            {main}
          </span>
          {sub && <span className="text-[12px] text-[#f3f0ed]/25">{sub}</span>}
        </div>

        {/* Divider */}
        <div className="my-5 h-px w-full bg-[#f3f0ed]/[0.05]" />

        {/* Features */}
        <ul className="flex flex-col gap-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <div
                className={`mt-[2px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ${
                  isCurrent || isCreator ? 'bg-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.06]'
                }`}
              >
                <Check className={`h-2.5 w-2.5 ${isCurrent || isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/45'}`} />
              </div>
              <span className="text-[12px] leading-snug text-[#f3f0ed]/55">{f}</span>
            </li>
          ))}
        </ul>

        {/* Generation examples */}
        {generationExamples.length > 0 && (
          <div className="mt-5">
            <div className="rounded-xl bg-[#f3f0ed]/[0.02] p-3.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/20">
                Estimativa de gerações
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {generationExamples.map((ex) => (
                  <div key={ex.label} className="flex items-center justify-between">
                    <span className="text-[10px] text-[#f3f0ed]/35">{ex.label}</span>
                    {ex.blocked ? (
                      <span className="flex items-center gap-1 text-[10px] text-red-400/40">
                        <Lock className="h-2.5 w-2.5" />
                        bloqueado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#f3f0ed]/55">{ex.count}</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] text-[#f3f0ed]/12">
                Usando todos os créditos em um único modelo
              </p>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        {!isFree && !isDowngrade && (
          <button
            disabled={isCurrent || !!subscribingSlug}
            onClick={() => onSubscribe(plan.slug)}
            className={`mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              isCurrent
                ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                : isCreator
                  ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_0_0_1px_rgba(162,221,0,0.3)] hover:shadow-[0_0_28px_rgba(162,221,0,0.25)] hover:brightness-110'
                  : 'border border-[#f3f0ed]/[0.08] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.03] hover:text-[#f3f0ed]'
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
      </div>
    </div>
  );
}

interface PlansModalProps {
  onClose: () => void;
}

export function PlansModal({ onClose }: PlansModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);

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
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isLoading = plansLoading || profileLoading;

  const currentPlanSlug =
    (profile?.plan as Record<string, unknown> | null)?.slug as string | null ?? null;

  const sub = profile?.subscription as Record<string, unknown> | null;
  const hasActiveSub = sub?.status === 'ACTIVE' || sub?.status === 'active';

  const sorted = (plans ?? []).slice().sort(
    (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
  );

  function getPlanAction(targetSlug: string): 'upgrade' | 'downgrade' | 'create' {
    if (!hasActiveSub || !currentPlanSlug || currentPlanSlug === 'free') return 'create';
    const currentIdx = PLAN_ORDER.indexOf(currentPlanSlug);
    const targetIdx = PLAN_ORDER.indexOf(targetSlug);
    return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
  }

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
      onClose();
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-7xl flex-col gap-5 overflow-y-auto sidebar-scroll rounded-[20px] border border-[#f3f0ed]/[0.06] bg-[#1a2123] p-5 shadow-2xl sm:gap-6 sm:p-6">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-[#f3f0ed] sm:text-xl">Escolha seu plano</h2>
          <p className="text-[11px] text-[#f3f0ed]/35 flex items-center gap-1.5">
            <Coins className="h-3 w-3 text-[#a2dd00]" />
            Créditos do plano renovam mensalmente
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {/* Cards */}
        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3 xl:gap-4">
            {sorted.map((plan) => {
              const isCurrent = currentPlanSlug === plan.slug;
              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={isCurrent}
                  planAction={isCurrent ? 'current' : getPlanAction(plan.slug)}
                  onSubscribe={handleSubscribe}
                  subscribingSlug={subscribingSlug}
                />
              );
            })}
          </div>
        )}

        <p className="text-center text-[11px] text-[#f3f0ed]/15">
          Créditos extras comprados nunca expiram · Acumulam com os do plano
        </p>
      </div>

      {/* Retention modal for downgrade */}
      {pendingDowngradeSlug && (() => {
        const currentPlan = sorted.find((p) => p.slug === currentPlanSlug);
        const targetPlan = sorted.find((p) => p.slug === pendingDowngradeSlug);
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
