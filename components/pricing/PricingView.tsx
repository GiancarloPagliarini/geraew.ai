'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BadgePercent, Check, CircleOff, Coins, Flame, Infinity as InfinityIcon, Zap, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { clearRecoveryPromo, getStoredRecoveryPromo } from '@/lib/recovery-promo';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';
import { PlansGrid } from '@/components/editor/PlansGrid';
import { PixAutoCheckoutModal } from '@/components/editor/PixAutoCheckoutModal';
import type { Plan } from '@/lib/api';
import { PLAN_ORDER, getPlanFeatureKeys } from '@/lib/plans';

/** Faixa de confiança exibida abaixo dos cards (garantias do plano). */
function TrustBar({ items }: { items: { icon: LucideIcon; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3 rounded-[14px] border border-app-hairline bg-app-surface/50 px-6 py-4">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="flex items-center gap-2.5 text-[13px] text-app-text-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(162,221,0,0.2)] bg-[rgba(162,221,0,0.07)]">
            <Icon className="size-3.5 text-app-lime" strokeWidth={2} />
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

/** Página de preços do shell — mesma lógica do PlansModal do workspace,
 *  renderizada como tela (sem overlay). */
export function PricingView() {
  const t = useTranslations('editorPlans');
  const locale = useLocale();
  const uiCurrency = locale === 'pt-BR' ? 'BRL' : 'USD';
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'credits'>('plans');
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [pixAutoPlan, setPixAutoPlan] = useState<Plan | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans', uiCurrency],
    queryFn: () => api.plans.list(accessToken!, uiCurrency),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: packages } = useQuery({
    queryKey: ['credits', 'packages', uiCurrency],
    queryFn: () => api.credits.packages(accessToken!, uiCurrency),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const isLoading = plansLoading || profileLoading;

  const currentPlanSlug =
    ((profile?.plan as Record<string, unknown> | null)?.slug as string | null) ?? null;

  const sub = profile?.subscription as Record<string, unknown> | null;
  const hasActiveSub = sub?.status === 'ACTIVE' || sub?.status === 'active';

  // Ordena do mais caro para o mais barato.
  const sorted = (plans ?? [])
    .slice()
    .sort((a, b) => PLAN_ORDER.indexOf(b.slug) - PLAN_ORDER.indexOf(a.slug));

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
      toast.success(t('manage.toasts.downgradeScheduled'), {
        description: t('manage.toasts.downgradeScheduledDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setPendingDowngradeSlug(null);
    } catch {
      toast.error(t('manage.toasts.downgradeError'), { description: t('manage.toasts.tryAgain') });
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
        const recoveryPromo = getStoredRecoveryPromo();
        const res = await api.subscriptions.create(accessToken, planSlug, uiCurrency, recoveryPromo);
        if (recoveryPromo) clearRecoveryPromo();
        checkoutUrl = res.checkoutUrl;
      } else {
        const res = await api.subscriptions.upgrade(accessToken, planSlug, uiCurrency);
        checkoutUrl = res.checkoutUrl;
      }
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        try {
          const res = await api.subscriptions.upgrade(accessToken, planSlug, uiCurrency);
          window.location.href = res.checkoutUrl;
        } catch {
          toast.error(t('manage.toasts.changePlanError'), { description: t('manage.toasts.tryAgain') });
          setSubscribingSlug(null);
        }
      } else {
        toast.error(t('manage.toasts.changePlanError'), { description: t('manage.toasts.tryAgain') });
        setSubscribingSlug(null);
      }
    }
  }

  return (
    // toda a área é o container de scroll, no padrão das demais telas
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-6 pb-16 pt-8 lg:px-11">
        {/* cabeçalho */}
        <div className="flex flex-col items-start gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-[rgba(162,221,0,0.25)] bg-[rgba(162,221,0,0.08)] px-3 py-1">
            <Flame className="size-3 text-app-lime" strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-lime">
              {t('plansModal.limitedOffer')}
            </span>
          </div>
          <h2 className="text-[26px] font-bold tracking-[-0.3px] text-app-text">
            {activeTab === 'plans' ? t('plansModal.titlePlans') : t('plansModal.titleCredits')}
          </h2>
          <p className="max-w-xl text-[14px] leading-relaxed text-app-text-2">
            {activeTab === 'plans'
              ? t('plansModal.plansSubtitle', { count: t('plansModal.creatorsCount') })
              : t('plansModal.creditsSubtitle')}
          </p>
        </div>

        {/* abas Planos / Créditos */}
        <div className="flex items-center justify-start border-b border-app-hairline pb-5">
          {isLoading ? (
            <div className="flex gap-1 rounded-[10px] border border-app-hairline bg-app-bg p-1">
              <div className="h-9 w-28 skeleton-app rounded-lg bg-app-surface" />
              <div className="h-9 w-40 skeleton-app rounded-lg bg-app-surface" />
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="flex gap-1 rounded-[10px] border border-app-hairline bg-app-bg p-1">
              <button
                type="button"
                onClick={() => setActiveTab('plans')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-colors duration-200 ease-app',
                  activeTab === 'plans'
                    ? 'bg-app-surface text-app-text'
                    : 'text-app-muted hover:text-app-text-2',
                )}
              >
                <BadgePercent className="size-3.5" strokeWidth={1.8} />
                {t('plansModal.tabPlans')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credits')}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-colors duration-200 ease-app',
                  activeTab === 'credits'
                    ? 'bg-app-surface text-app-text'
                    : 'text-app-muted hover:text-app-text-2',
                )}
              >
                <Coins className="size-3.5" strokeWidth={1.8} />
                {t('plansModal.tabCredits')}
              </button>
            </div>
          ) : null}
        </div>

        {/* planos */}
        {activeTab === 'plans' && (
          <>
            <PlansGrid
              plans={plans ?? []}
              currentPlanSlug={currentPlanSlug}
              hasActiveSub={hasActiveSub}
              subscribingSlug={subscribingSlug}
              onSubscribe={handleSubscribe}
              onSubscribePix={(plan) => setPixAutoPlan(plan)}
              compact
              isLoading={isLoading}
            />
            {!isLoading && (
              <TrustBar
                items={[
                  { icon: CircleOff, label: t('plansModal.cancelAnytime') },
                  { icon: Check, label: t('plansModal.noCancelFee') },
                  { icon: Coins, label: t('plansModal.creditsRenew') },
                ]}
              />
            )}
          </>
        )}

        {/* créditos avulsos */}
        {!isLoading && activeTab === 'credits' && packages && packages.length > 0 && (
          <>
            <CreditPackagesGrid packages={packages} currency={uiCurrency} compact />
            <TrustBar
              items={[
                { icon: Coins, label: t('plansModal.stackWithPlan') },
                { icon: Zap, label: t('plansModal.instant') },
                { icon: InfinityIcon, label: t('plansModal.neverExpire') },
              ]}
            />
          </>
        )}
      </div>

      {/* PIX Automático checkout */}
      {pixAutoPlan && (
        <PixAutoCheckoutModal
          planSlug={pixAutoPlan.slug}
          planName={pixAutoPlan.name}
          priceCents={pixAutoPlan.priceCents}
          onClose={() => setPixAutoPlan(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
            queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
          }}
        />
      )}

      {/* retenção no downgrade */}
      {pendingDowngradeSlug &&
        (() => {
          const currentPlan = sorted.find((p) => p.slug === currentPlanSlug);
          const targetPlan = sorted.find((p) => p.slug === pendingDowngradeSlug);
          const currentFeatureKeys = currentPlan ? getPlanFeatureKeys(currentPlan) : [];
          const targetFeatureKeys = targetPlan ? getPlanFeatureKeys(targetPlan) : [];
          const targetKeySet = new Set(targetFeatureKeys.map((e) => e.key));
          const lostBenefits = currentFeatureKeys
            .filter((e) => !targetKeySet.has(e.key))
            .map((e) =>
              t(e.key as 'features.emailSupport', e.values as Record<string, number | string> | undefined),
            );
          if (currentPlan && targetPlan) {
            const creditDiff = currentPlan.creditsPerMonth - targetPlan.creditsPerMonth;
            if (creditDiff > 0) {
              lostBenefits.unshift(t('manage.retentionLostBenefits.creditsLess', { count: creditDiff }));
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
              lostBenefits={
                lostBenefits.length > 0
                  ? lostBenefits
                  : [t('manage.retentionLostBenefits.currentPlanBenefits')]
              }
            />
          );
        })()}
    </div>
  );
}
