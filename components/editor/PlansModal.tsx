'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Coins,
  Loader2,
  Sparkles,
  X,
  ArrowRight,
  Zap,
  Crown,
  Users,
  Shield,
  Flame,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Plan } from '@/lib/api';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';
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
  const isPro = plan.slug === 'pro';
  const isStudio = plan.slug === 'studio';
  const { main, sub } = formatPrice(plan.priceCents);
  const isSubscribing = subscribingSlug === plan.slug;
  const features = getPlanFeatures(plan);
  const isDowngrade = planAction === 'downgrade';
  const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];
  const originalPrice = PLAN_ORIGINAL_PRICES[plan.slug];
  const discountLabel = PLAN_DISCOUNT_LABELS[plan.slug];
  const socialProof = PLAN_SOCIAL_PROOF[plan.slug];

  const actionLabel = {
    upgrade: 'Fazer upgrade',
    downgrade: 'Fazer downgrade',
    create: 'Começar agora',
    current: 'Plano ativo',
  }[planAction];

  const PlanIcon = isStudio ? Crown : isPro ? Zap : isCreator ? Sparkles : isFree ? Users : Coins;

  return (
    <div
      className={`group relative flex flex-col rounded-[16px] border transition-all duration-300 ${isDowngrade
          ? 'border-[#f3f0ed]/5 bg-[#1c2527]/60 opacity-40 pointer-events-none'
          : isCurrent
            ? 'border-[#f3f0ed]/25 bg-[#1e2325] ring-1 ring-[#f3f0ed]/10'
            : isCreator
              ? 'border-[#a2dd00]/30 bg-gradient-to-b from-[#1f2d20] to-[#1a2523] ring-1 ring-[#a2dd00]/15 shadow-[0_0_40px_rgba(162,221,0,0.08)] hover:shadow-[0_0_60px_rgba(162,221,0,0.12)]'
              : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.12] hover:bg-[#1a1f21]'
        }`}
    >
      {/* Top glow — only for Creator (popular) */}
      {isCreator && !isDowngrade && (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-[16px]"
            style={{
              background: 'linear-gradient(180deg, rgba(162,221,0,0.15) 0%, rgba(162,221,0,0) 50%)',
            }}
          />
          <div
            className="pointer-events-none absolute -top-[1px] left-8 right-8 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(162,221,0,0.6), transparent)',
            }}
          />
        </>
      )}

      {/* Current plan glow */}
      {isCurrent && !isCreator && (
        <div
          className="pointer-events-none absolute -inset-px rounded-[16px] opacity-40"
          style={{
            background: 'linear-gradient(180deg, rgba(243,240,237,0.06) 0%, rgba(243,240,237,0) 35%)',
          }}
        />
      )}

      {/* Badge — current plan */}
      {isCurrent && (
        <div className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-[#f3f0ed] px-3 py-0.5 shadow-[0_0_16px_rgba(243,240,237,0.15)]">
            <Check className="h-2.5 w-2.5 text-[#1a2123]" />
            <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#1a2123]">Seu Plano</span>
          </div>
        </div>
      )}

      {/* Badge — popular (Creator) */}
      {isCreator && !isCurrent && (
        <div className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-0.5 shadow-[0_0_30px_rgba(162,221,0,0.4)]">
            <Flame className="h-2.5 w-2.5 text-[#141a1c]" />
            <span className="text-[8px] font-extrabold uppercase tracking-[0.08em] text-[#141a1c]">Mais Popular</span>
          </div>
        </div>
      )}

      {/* Card inner */}
      <div className="relative flex flex-1 flex-col p-3">

        {/* Plan icon + name */}
        <div className="flex items-center gap-1.5">
          <div className={`flex h-6 w-6 items-center justify-center rounded-md ${isCreator ? 'bg-[#a2dd00]/15' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.05]'
            }`}>
            <PlanIcon className={`h-3 w-3 ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/70' : 'text-[#f3f0ed]/40'
              }`} />
          </div>
          <div>
            <h3 className="text-[12px] font-bold text-[#f3f0ed]">{plan.name}</h3>
            {PLAN_SUBTITLES[plan.slug] && (
              <span className="text-[8px] text-[#f3f0ed]/30">{PLAN_SUBTITLES[plan.slug]}</span>
            )}
          </div>
        </div>

        {/* Price block with anchor pricing */}
        <div className="mt-2.5 min-h-[42px]">
          {originalPrice && !isFree && (
            <div className="mb-0.5 flex items-center gap-1">
              <span className="text-[10px] text-[#f3f0ed]/25 line-through">
                {formatPriceRaw(originalPrice)}
              </span>
              {discountLabel && (
                <span className="rounded bg-[#a2dd00]/15 px-1 py-0.5 text-[7px] font-bold text-[#a2dd00]">
                  {discountLabel}
                </span>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className={`text-[16px] font-extrabold leading-none tracking-tight ${isFree ? 'text-[#a2dd00]' : isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {main}
            </span>
            {sub && <span className="text-[9px] text-[#f3f0ed]/30">{sub}</span>}
          </div>
        </div>

        {/* Credits highlight */}
        <div className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${isCreator ? 'bg-[#a2dd00]/10 border border-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.03] border border-[#f3f0ed]/[0.05]'
          }`}>
          <Coins className={`h-3 w-3 ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
          <div>
            <span className={`text-[12px] font-extrabold tabular-nums ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {isFree ? plan.creditsPerMonth : plan.creditsPerMonth.toLocaleString('pt-BR')}
            </span>
            <span className="ml-1 text-[9px] text-[#f3f0ed]/30">
              créditos{isFree ? '' : '/mês'}
            </span>
          </div>
        </div>

        {/* Social proof */}
        {socialProof && !isDowngrade && (
          <p className="mt-1.5 text-[9px] font-medium text-[#a2dd00]/70">
            {socialProof}
          </p>
        )}

        {/* Divider */}
        <div className="my-2 h-px w-full bg-[#f3f0ed]/[0.06]" />

        {/* Features */}
        <ul className="flex min-h-[70px] flex-col gap-1.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <div
                className={`mt-[1px] flex h-[12px] w-[12px] shrink-0 items-center justify-center rounded-full ${isCreator ? 'bg-[#a2dd00]/20' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.06]'
                  }`}
              >
                <Check className={`h-1.5 w-1.5 ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/60' : 'text-[#f3f0ed]/45'}`} />
              </div>
              <span className="text-[10px] leading-snug text-[#f3f0ed]/55">{f}</span>
            </li>
          ))}
        </ul>

        {/* Generation examples — compact */}
        <div className="mt-2 flex min-h-[65px] flex-col gap-0.5">
          {generationExamples.length > 0 && (
            <>
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/20">
                O que dá pra criar
              </p>
              {generationExamples.map((ex) => (
                <div key={ex.label} className="flex items-center justify-between">
                  <span className="text-[8px] text-[#f3f0ed]/35">{ex.label}</span>
                  <span className={`text-[8px] font-semibold ${isCreator ? 'text-[#a2dd00]/60' : isCurrent ? 'text-[#f3f0ed]/55' : 'text-[#f3f0ed]/45'
                    }`}>
                    {ex.count}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* CTA */}
        {!isFree && !isDowngrade && (
          <button
            disabled={isCurrent || !!subscribingSlug}
            onClick={() => onSubscribe(plan.slug)}
            className={`mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-[11px] font-bold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${isCurrent
                ? 'bg-[#f3f0ed]/10 text-[#f3f0ed]/60'
                : isCreator
                  ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_4px_20px_rgba(162,221,0,0.3)] hover:shadow-[0_4px_30px_rgba(162,221,0,0.4)] hover:brightness-110'
                  : 'border border-[#f3f0ed]/[0.1] bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/80 hover:border-[#f3f0ed]/[0.2] hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]'
              }`}
          >
            {isSubscribing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                {actionLabel}
                {!isCurrent && <ArrowRight className="h-2.5 w-2.5" />}
              </>
            )}
          </button>
        )}

        {/* Micro-urgency for Creator */}
        {/* {isCreator && !isCurrent && !isDowngrade && (
          <p className="mt-1.5 text-center text-[8px] text-[#f3f0ed]/25">
            Preço promocional · Pode aumentar
          </p>
        )} */}
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

  const { data: packages } = useQuery({
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
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-7xl flex-col gap-4 overflow-y-auto sidebar-scroll rounded-[20px] border border-[#f3f0ed]/[0.06] bg-[#1a2123] p-4 shadow-2xl sm:p-5">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-3 py-1">
            <Flame className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]">Oferta por tempo limitado</span>
          </div>
          <h2 className="text-lg font-bold text-[#f3f0ed] sm:text-xl">Escolha seu plano e comece a criar</h2>
          <p className="max-w-md text-[12px] text-[#f3f0ed]/45">
            Mais de <span className="font-semibold text-[#f3f0ed]/70">2.400 criadores</span> já estão gerando conteúdo.
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[#f3f0ed]/30">
            <span className="flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" />
              Garantia de 7 dias
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" />
              Cancele quando quiser
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {/* Plans — single row of 5 */}
        {!isLoading && sorted.length > 0 && (
          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
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

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[#f3f0ed]/25">
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
            Sem taxa de cancelamento
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
            Créditos renovam mensalmente
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
            Garantia de reembolso em 7 dias
          </span>
        </div>

        {/* Credit packages section */}
        {packages && packages.length > 0 && (
          <>
            <div className="h-px w-full bg-[#f3f0ed]/[0.06]" />
            <div className="flex flex-col items-center gap-0.5 text-center">
              <h3 className="text-[13px] font-bold text-[#f3f0ed]">Pacotes de créditos</h3>
              <p className="text-[10px] text-[#f3f0ed]/35">Compra única · Sem assinatura · Nunca expiram</p>
            </div>
            <CreditPackagesGrid packages={packages} compact />
          </>
        )}
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
