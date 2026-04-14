'use client';

import { useQuery } from '@tanstack/react-query';
import {
  X,
  Crown,
  Coins,
  CreditCard,
  CalendarDays,
  Loader2,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatCurrency, PLAN_ORDER, getPlanFeatureKeys } from '@/lib/plans';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ManageSubscriptionModalProps {
  onClose: () => void;
}

export function ManageSubscriptionModal({ onClose }: ManageSubscriptionModalProps) {
  const t = useTranslations('editorPlans');
  const locale = useLocale();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showPlanOptions, setShowPlanOptions] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
  });

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', 'current'],
    queryFn: () => api.subscriptions.current(accessToken!),
    enabled: !!accessToken,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.subscriptions.cancel(accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setShowCancelModal(false);
      toast.success(t('manage.toasts.subscriptionCanceled'), {
        description: t('manage.toasts.subscriptionCanceledDesc'),
      });
      onClose();
    },
    onError: () =>
      toast.error(t('manage.toasts.cancelError'), { description: t('manage.toasts.tryAgain') }),
  });

  const acceptOfferMutation = useMutation({
    mutationFn: (reason: string) => api.subscriptions.acceptOffer(accessToken!, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      setShowCancelModal(false);
      setPendingDowngradeSlug(null);
      const messages: Record<string, { title: string; desc: string }> = {
        discount: { title: t('manage.toasts.offerDiscountTitle'), desc: data.detail },
        bonus_credits: { title: t('manage.toasts.offerBonusTitle'), desc: data.detail },
        pause: {
          title: t('manage.toasts.offerPauseTitle'),
          desc: t('manage.toasts.offerPauseDesc'),
        },
      };
      const msg = messages[data.offerType] || {
        title: t('manage.toasts.offerAcceptedTitle'),
        desc: data.detail,
      };
      toast.success(msg.title, { description: msg.desc });
    },
    onError: () =>
      toast.error(t('manage.toasts.offerApplyError'), {
        description: t('manage.toasts.tryAgain'),
      }),
  });

  const cancelDowngradeMutation = useMutation({
    mutationFn: () => api.subscriptions.cancelDowngrade(accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      toast.success(t('manage.toasts.downgradeUndone'), {
        description: t('manage.toasts.downgradeUndoneDesc'),
      });
    },
    onError: () =>
      toast.error(t('manage.toasts.downgradeUndoError'), {
        description: t('manage.toasts.tryAgain'),
      }),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.subscriptions.reactivate(accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'current'] });
      toast.success(t('manage.toasts.reactivated'), {
        description: t('manage.toasts.reactivatedDesc'),
      });
    },
    onError: () =>
      toast.error(t('manage.toasts.reactivateError'), {
        description: t('manage.toasts.tryAgain'),
      }),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showCancelModal || pendingDowngradeSlug) return;
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, showCancelModal, pendingDowngradeSlug]);

  const isLoading = profileLoading || balanceLoading;

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative mx-4 flex w-full max-w-lg flex-col items-center gap-4 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-8 shadow-2xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // Plan info
  const plan = profile.plan as Record<string, unknown> | null;
  const planName = (plan?.name as string) || (plan?.planName as string) || t('manage.noPlan');
  const planSlug = (plan?.slug as string) || 'free';
  const planPriceCents = (plan?.priceCents as number) || 0;
  const planCurrency = (plan?.currency as string) || 'BRL';
  const isFreeUser = planSlug === 'free' || !planSlug;

  // Subscription info
  const sub = profile.subscription as Record<string, unknown> | null;
  const subStatus = (sub?.status as string) || null;
  const cancelAtPeriodEnd = (sub?.cancelAtPeriodEnd as boolean) || false;
  const isActive = subStatus?.toLowerCase() === 'active';
  const subEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd as string).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Credits
  const creditsRemaining = balance ? balance.totalCreditsAvailable : 0;

  // Discount info from Stripe subscription
  const discount = subscription?.discount as {
    percentOff: number | null;
    amountOffCents: number | null;
    durationMonths: number | null;
    remainingMonths: number | null;
  } | null | undefined;
  const hasDiscount = !!(discount?.percentOff || discount?.amountOffCents);

  // Scheduled plan change (downgrade pending for next cycle)
  const scheduledPlan = (subscription as Record<string, unknown> | null)?.scheduledPlan as {
    name: string;
    priceCents: number;
  } | null | undefined;

  // Retention offer already used? Hide cancel/downgrade retention modals
  const retentionOfferUsed = !!(subscription as Record<string, unknown> | null)?.retentionOfferAcceptedAt;

  // Price formatting
  const priceMain =
    planPriceCents === 0 ? t('free') : formatCurrency(planPriceCents, planCurrency, locale);
  const discountedPriceCents = discount?.percentOff
    ? Math.round(planPriceCents * (1 - discount.percentOff / 100))
    : discount?.amountOffCents
      ? Math.max(0, planPriceCents - discount.amountOffCents)
      : planPriceCents;
  const discountedPriceMain =
    discountedPriceCents === 0
      ? t('free')
      : formatCurrency(discountedPriceCents, planCurrency, locale);

  // Next payment = same as plan cost (unless canceled)
  const nextPayment = cancelAtPeriodEnd
    ? t('manage.canceled')
    : hasDiscount
      ? discountedPriceMain
      : priceMain;

  // Plan change options
  const currentPlanIdx = PLAN_ORDER.indexOf(planSlug);
  const upgradePlans = (plans ?? [])
    .filter((p) => PLAN_ORDER.indexOf(p.slug) > currentPlanIdx)
    .sort((a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug));
  const downgradePlans = (plans ?? [])
    .filter((p) => {
      const idx = PLAN_ORDER.indexOf(p.slug);
      return idx < currentPlanIdx && p.slug !== 'free';
    })
    .sort((a, b) => PLAN_ORDER.indexOf(b.slug) - PLAN_ORDER.indexOf(a.slug));

  async function executeDowngrade(targetSlug: string) {
    if (!accessToken) return;
    setIsDowngrading(true);
    try {
      await api.subscriptions.downgrade(accessToken, targetSlug);
      toast.success(t('manage.toasts.downgradeScheduled'), {
        description: t('manage.toasts.downgradeScheduledDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setPendingDowngradeSlug(null);
      onClose();
    } catch {
      toast.error(t('manage.toasts.downgradeError'), {
        description: t('manage.toasts.tryAgain'),
      });
    } finally {
      setIsDowngrading(false);
    }
  }

  async function executeUpgrade(targetSlug: string) {
    if (!accessToken) return;
    setIsUpgrading(true);
    try {
      const { checkoutUrl } = await api.subscriptions.upgrade(accessToken, targetSlug);
      window.location.href = checkoutUrl;
    } catch {
      toast.error(t('manage.toasts.upgradeError'), {
        description: t('manage.toasts.tryAgain'),
      });
      setIsUpgrading(false);
    }
  }

  async function openBillingPortal() {
    if (!accessToken) return;
    setIsOpeningPortal(true);
    try {
      const { portalUrl } = await api.subscriptions.billingPortal(accessToken);
      window.open(portalUrl, '_blank');
    } catch {
      toast.error(t('manage.toasts.portalError'), {
        description: t('manage.toasts.tryAgain'),
      });
    } finally {
      setIsOpeningPortal(false);
    }
  }

  const sorted = (plans ?? []).slice().sort(
    (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
  );

  const perMonthShort = t('manage.perMonthShort');

  return (
    <>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative mx-4 flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-5 shadow-2xl sm:p-6">

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a2dd00]/10">
              <Settings className="h-5 w-5 text-[#a2dd00]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f3f0ed]">{t('manage.title')}</h2>
              <p className="text-[11px] text-[#f3f0ed]/40">{t('manage.subtitle')}</p>
            </div>
          </div>

          {/* Info rows */}
          <div className="flex flex-col gap-2.5">
            {/* Plano */}
            <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.03] px-4 py-3">
              <Crown className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
              <span className="flex-1 text-xs text-[#f3f0ed]/40">{t('manage.plan')}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#f3f0ed]">
                {planName}
                {isActive && !cancelAtPeriodEnd && (
                  <span className="rounded-full bg-green-400/10 px-1.5 py-0.5 text-[10px] font-bold text-green-400">{t('manage.active')}</span>
                )}
                {cancelAtPeriodEnd && (
                  <span className="rounded-full bg-red-400/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">{t('manage.canceling')}</span>
                )}
              </span>
            </div>

            {/* Scheduled plan change notice */}
            {scheduledPlan && !cancelAtPeriodEnd && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-amber-400/60" />
                  <span className="text-[11px] text-amber-400/80">
                    {t.rich('manage.scheduledChange', {
                      name: (chunks) => <span className="font-semibold">{chunks}</span>,
                      planName: scheduledPlan.name,
                      price: formatCurrency(scheduledPlan.priceCents, planCurrency, locale),
                    })}
                  </span>
                </div>
                <button
                  onClick={() => cancelDowngradeMutation.mutate()}
                  disabled={cancelDowngradeMutation.isPending}
                  className="shrink-0 rounded-md bg-amber-400/15 px-2 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-400/25 disabled:opacity-50"
                >
                  {cancelDowngradeMutation.isPending ? t('manage.undoing') : t('manage.undo')}
                </button>
              </div>
            )}

            {/* Créditos restantes */}
            <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.03] px-4 py-3">
              <Coins className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
              <span className="flex-1 text-xs text-[#f3f0ed]/40">{t('manage.remainingCredits')}</span>
              <span className="text-xs font-medium text-[#f3f0ed]">
                {creditsRemaining.toLocaleString(locale)}
              </span>
            </div>

            {/* Custo do plano */}
            <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.03] px-4 py-3">
              <CreditCard className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
              <span className="flex-1 text-xs text-[#f3f0ed]/40">{t('manage.planCost')}</span>
              <div className="flex items-center gap-2">
                {hasDiscount ? (
                  <>
                    <span className="text-[10px] text-[#f3f0ed]/30 line-through">{priceMain}</span>
                    <span className="text-xs font-medium text-[#a2dd00]">{discountedPriceMain}</span>
                    <span className="rounded-full bg-[#a2dd00]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#a2dd00]">
                      {discount!.percentOff
                        ? t('badges.discountOff', { pct: discount!.percentOff })
                        : t('manage.amountOff', {
                            amount: formatCurrency(discount!.amountOffCents!, planCurrency, locale),
                          })}
                      {discount!.remainingMonths != null &&
                        t('manage.discountMonths', { m: discount!.remainingMonths })}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-[#f3f0ed]">{priceMain}</span>
                )}
              </div>
            </div>

            {/* Próximo pagamento */}
            <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.03] px-4 py-3">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
              <span className="flex-1 text-xs text-[#f3f0ed]/40">{t('manage.nextPayment')}</span>
              <div className="flex flex-col items-end">
                <span className={`text-xs font-medium ${cancelAtPeriodEnd ? 'text-red-400' : hasDiscount ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
                  {nextPayment}
                </span>
                {subEnd && !cancelAtPeriodEnd && (
                  <span className="text-[10px] text-[#f3f0ed]/30">{t('manage.onDate', { date: subEnd })}</span>
                )}
                {subEnd && cancelAtPeriodEnd && (
                  <span className="text-[10px] text-[#f3f0ed]/30">{t('manage.accessUntil', { date: subEnd })}</span>
                )}
              </div>
            </div>
          </div>

          {/* Billing portal — manage cards and invoices */}
          {!isFreeUser && (
            <button
              onClick={openBillingPortal}
              disabled={isOpeningPortal}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.03] px-4 py-2.5 text-xs text-[#f3f0ed]/50 transition-colors hover:border-[#f3f0ed]/15 hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]/70 disabled:opacity-50"
            >
              {isOpeningPortal ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CreditCard className="h-3.5 w-3.5" />
              )}
              {t('manage.manageBillingPortal')}
            </button>
          )}

          {/* Actions — only show for active paid subscriptions */}
          {isActive && !isFreeUser && (
            <div className="flex flex-col gap-3">
              {/* Change plan — collapsible with upgrade + downgrade options */}
              {(upgradePlans.length > 0 || downgradePlans.length > 0) && !cancelAtPeriodEnd && (
                <div>
                  <button
                    onClick={() => setShowPlanOptions(!showPlanOptions)}
                    className="flex w-full items-center justify-between rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] px-4 py-2.5 text-xs text-[#f3f0ed]/30 transition-colors hover:border-[#f3f0ed]/10 hover:text-[#f3f0ed]/50"
                  >
                    <span className="flex items-center gap-2">
                      <ChevronDown className={`h-3 w-3 transition-transform ${showPlanOptions ? 'rotate-180' : ''}`} />
                      {t('manage.changePlan')}
                    </span>
                  </button>

                  {showPlanOptions && (
                    <div className="mt-2 flex flex-col gap-1.5 pl-2">
                      {upgradePlans.map((p) => {
                        const main = formatCurrency(p.priceCents, p.currency || planCurrency, locale);
                        return (
                          <button
                            key={p.id}
                            onClick={() => executeUpgrade(p.slug)}
                            disabled={isUpgrading}
                            className="flex items-center justify-between rounded-lg border border-[#a2dd00]/15 bg-[#a2dd00]/5 px-3 py-2 text-xs text-[#f3f0ed]/60 transition-colors hover:border-[#a2dd00]/30 hover:bg-[#a2dd00]/10"
                          >
                            <span className="flex items-center gap-1.5">
                              {p.name}
                              <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#a2dd00]">{t('badges.upgrade')}</span>
                            </span>
                            <span className="text-[#a2dd00]/60">{main}{perMonthShort}</span>
                          </button>
                        );
                      })}
                      {!scheduledPlan && downgradePlans.map((p) => {
                        const main = formatCurrency(p.priceCents, p.currency || planCurrency, locale);
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPendingDowngradeSlug(p.slug)}
                            className="flex items-center justify-between rounded-lg border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] px-3 py-2 text-xs text-[#f3f0ed]/40 transition-colors hover:border-[#f3f0ed]/12 hover:text-[#f3f0ed]/60"
                          >
                            <span>{p.name}</span>
                            <span className="text-[#f3f0ed]/25">{main}{perMonthShort}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Cancel — minimal text link, not a button */}
              {!cancelAtPeriodEnd ? (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-[11px] text-[#f3f0ed]/15 transition-colors hover:text-[#f3f0ed]/30"
                  >
                    {t('manage.needToCancel')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-[11px] text-[#f3f0ed]/25">
                    {t('manage.willCancelOn', { date: subEnd ?? '' })}
                  </p>
                  <button
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    className="rounded-lg border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-4 py-1.5 text-[11px] font-medium text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/20 disabled:opacity-50"
                  >
                    {reactivateMutation.isPending ? t('manage.reactivating') : t('manage.reactivate')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Free user message */}
          {isFreeUser && (
            <p className="text-center text-xs text-[#f3f0ed]/30">
              {t('manage.freeUserMessage')}
            </p>
          )}
        </div>
      </div>

      {/* Cancel retention modal */}
      {showCancelModal && (
        <CancelRetentionModal
          action="cancel"
          onClose={() => setShowCancelModal(false)}
          onConfirm={() => cancelMutation.mutate()}
          onAcceptOffer={(reasonId) => {
            acceptOfferMutation.mutate(reasonId);
          }}
          isLoading={cancelMutation.isPending}
          isAcceptingOffer={acceptOfferMutation.isPending}
          currentPlanName={planName}
          accessEndDate={subEnd ?? undefined}
          hideOffers={retentionOfferUsed}
          lostBenefits={[
            t('manage.retentionLostBenefits.allCredits', { plan: planName }),
            t('manage.retentionLostBenefits.speedPriority'),
            t('manage.retentionLostBenefits.extendedGallery'),
            t('manage.retentionLostBenefits.prioritySupport'),
            t('manage.retentionLostBenefits.noWatermark'),
          ]}
        />
      )}

      {/* Downgrade retention modal */}
      {pendingDowngradeSlug && (() => {
        const currentPlan = sorted.find((p) => p.slug === planSlug);
        const targetPlan = sorted.find((p) => p.slug === pendingDowngradeSlug);
        const currentFeatureKeys = currentPlan ? getPlanFeatureKeys(currentPlan) : [];
        const targetFeatureKeys = targetPlan ? getPlanFeatureKeys(targetPlan) : [];
        const targetKeySet = new Set(targetFeatureKeys.map((e) => e.key));
        const lostBenefits = currentFeatureKeys
          .filter((e) => !targetKeySet.has(e.key))
          .map((e) =>
            t(
              e.key as 'features.emailSupport',
              e.values as Record<string, number | string> | undefined,
            ),
          );
        if (currentPlan && targetPlan) {
          const creditDiff = currentPlan.creditsPerMonth - targetPlan.creditsPerMonth;
          if (creditDiff > 0) {
            lostBenefits.unshift(
              t('manage.retentionLostBenefits.creditsLess', { count: creditDiff }),
            );
          }
        }
        return (
          <CancelRetentionModal
            action="downgrade"
            onClose={() => setPendingDowngradeSlug(null)}
            onConfirm={() => executeDowngrade(pendingDowngradeSlug)}
            onAcceptOffer={(reasonId) => {
              acceptOfferMutation.mutate(reasonId);
            }}
            isLoading={isDowngrading}
            isAcceptingOffer={acceptOfferMutation.isPending}
            currentPlanName={currentPlan?.name}
            targetPlanName={targetPlan?.name}
            hideOffers={retentionOfferUsed}
            lostBenefits={
              lostBenefits.length > 0
                ? lostBenefits
                : [t('manage.retentionLostBenefits.currentPlanBenefits')]
            }
          />
        );
      })()}
    </>
  );
}
