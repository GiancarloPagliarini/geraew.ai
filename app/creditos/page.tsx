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
  Lock,
  AlertTriangle,
  Zap,
  Shield,
  Flame,
  BadgePercent,
  CircleOff,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLoginModal } from '@/lib/login-modal-context';
import { Suspense, useEffect, useRef, useState } from 'react';
import { PLAN_ORDER, getPlanFeatures } from '@/lib/plans';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import { PlansGrid } from '@/components/editor/PlansGrid';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { useLocale, useTranslations } from 'next-intl';

function CreditosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const autoSubscribeTriggered = useRef(false);
  const loadingMsg = useLoadingMessage('creditos');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'credits'>('plans');
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const t = useTranslations('account.credits');
  const tCommon = useTranslations('account.common');
  const locale = useLocale();
  const dateLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  const numFmt = new Intl.NumberFormat(dateLocale);

  async function executeDowngrade(planSlug: string) {
    if (!accessToken) return;
    setIsDowngrading(true);
    try {
      await api.subscriptions.downgrade(accessToken, planSlug);
      toast.success(t('downgradeScheduledTitle'), {
        description: t('downgradeScheduledDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setPendingDowngradeSlug(null);
    } catch {
      toast.error(t('downgradeErrorTitle'), { description: t('downgradeErrorDescription') });
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
          toast.error(t('changePlanErrorTitle'), { description: t('changePlanErrorDescription') });
          setSubscribingSlug(null);
        }
      } else {
        toast.error(t('changePlanErrorTitle'), { description: t('changePlanErrorDescription') });
        setSubscribingSlug(null);
      }
    }
  }

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const uiCurrency = locale === 'en' ? 'USD' : 'BRL';

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans', uiCurrency],
    queryFn: () => api.plans.list(accessToken!, uiCurrency),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: packages, isLoading: packagesLoading } = useQuery({
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

  useEffect(() => {
    if (!authLoading && !user) openLoginModal();
  }, [authLoading, user, router]);

  // Auto-trigger checkout when redirected from landing page with ?plan=
  const planFromUrl = searchParams.get('plan');
  useEffect(() => {
    if (
      planFromUrl &&
      !autoSubscribeTriggered.current &&
      accessToken &&
      !plansLoading &&
      plans &&
      plans.length > 0
    ) {
      const targetPlan = plans.find((p) => p.slug === planFromUrl);
      if (targetPlan && targetPlan.priceCents > 0) {
        autoSubscribeTriggered.current = true;
        handleSubscribe(targetPlan.slug);
      }
    }
  }, [planFromUrl, accessToken, plansLoading, plans]);

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
    ? new Date(balance.periodStart).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })
    : '';
  const periodEnd = balance
    ? new Date(balance.periodEnd).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })
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
              <h3 className="text-lg font-bold text-[#f3f0ed]">{t('zeroTitle')}</h3>
              <p className="mt-2 text-sm text-[#f3f0ed]/50">
                {t('zeroDescription')}
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
                {t('renewNow')}
              </button>
              <button
                onClick={() => {
                  const boostSection = document.getElementById('boost-section');
                  boostSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/15 text-sm font-medium text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/5"
              >
                {t('buyExtraCredits')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#f3f0ed]/7 px-4">
        <button
          onClick={() => router.push('/workspace')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon('backToEditor')}
        </button>
        <LocaleSwitcher compact />
      </header>

      {/* Low credits banner */}
      {showLowCreditsBanner && (
        <div className="border-b border-yellow-500/20 bg-yellow-500/8 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-yellow-300/80">
                {t('lowCreditsWarning', { count: numFmt.format(balance!.totalCreditsAvailable) })}
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
                {t('buyBoost')}
              </button>
              <button
                onClick={() => {
                  const plansSection = document.getElementById('plans-section');
                  plansSection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs font-bold text-[#a2dd00] transition-colors hover:text-[#b5e82d]"
              >
                {t('renewPlan')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-360 flex-col gap-12 px-4 py-10">

        {/* -- Free generations banner -- */}
        {balance && (() => {
          const fg = balance.freeGenerations ?? { NB2: 0, NB_PRO: 0, FACE_SWAP: 0, VIRTUAL_TRY_ON: 0, GERAEW_FAST: 0, UPSCALE: 0 };
          const total = fg.NB2 + fg.NB_PRO + fg.FACE_SWAP + fg.VIRTUAL_TRY_ON + fg.GERAEW_FAST + (fg.UPSCALE ?? 0);
          if (total <= 0) return null;
          const items: { label: string; count: number }[] = [
            { label: 'Nano Banana 2', count: fg.NB2 },
            { label: 'Nano Banana Pro', count: fg.NB_PRO },
            { label: 'Face Swap', count: fg.FACE_SWAP },
            { label: 'Try-On', count: fg.VIRTUAL_TRY_ON },
            { label: 'Vídeo (GeraEW Fast)', count: fg.GERAEW_FAST },
            { label: 'Upscale', count: fg.UPSCALE ?? 0 },
          ].filter((i) => i.count > 0);
          return (
            <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-emerald-400">Gerações grátis disponíveis</span>
                  <span className="text-xs text-[#f3f0ed]/50">
                    Você tem {total} {total === 1 ? 'geração' : 'gerações'} grátis pra usar sem gastar créditos.
                  </span>
                </div>
                <span className="ml-auto text-2xl font-bold tabular-nums text-emerald-400">{total}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2"
                  >
                    <span className="text-xs text-[#f3f0ed]/70">{item.label}</span>
                    <span className="text-sm font-bold text-emerald-400">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* -- Balance -- */}
        {balance && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#a2dd00]" />
              <h1 className="text-lg font-bold text-[#f3f0ed]">{t('yourCredits')}</h1>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-[#a2dd00]/25 bg-[#a2dd00]/6 p-5">
                <div className="flex items-center gap-2 text-[#a2dd00]/60">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.15em]">{t('available')}</span>
                </div>
                <p className="mt-3 text-3xl font-bold tabular-nums text-[#a2dd00] sm:text-4xl">
                  {numFmt.format(balance.totalCreditsAvailable)}
                </p>
                <div className="mt-4 flex gap-4 text-xs text-[#a2dd00]/50">
                  <span>{t('fromPlan', { count: numFmt.format(balance.planCreditsRemaining) })}</span>
                  <span>{t('bonus', { count: numFmt.format(balance.bonusCreditsRemaining) })}</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-5">
                <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.12em]">{t('used')}</span>
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-[#f3f0ed]">
                  {numFmt.format(balance.planCreditsUsed)}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-5">
                <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold tracking-[0.12em]">{t('period')}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-[#f3f0ed]">
                  {isFreeUser ? (
                    <span>{t('daily')}</span>
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
                <span className="font-medium">{t('consumption')}</span>
                <span>{t('percentUsed', { percent: usagePercent.toFixed(1) })}</span>
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

        {/* -- Plans & Credits tabs -- */}
        {(sortedPlans.length > 0 || (packages && packages.length > 0)) && (
          <div id="plans-section" className="flex flex-col gap-8">

            {/* Heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-4 py-1.5">
                <Flame className="h-3.5 w-3.5 text-[#a2dd00]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]">{t('limitedOffer')}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#f3f0ed] sm:text-3xl">
                {activeTab === 'plans' ? t('plansHeading') : t('packagesHeading')}
              </h2>
              <p className="max-w-md text-sm text-[#f3f0ed]/45">
                {activeTab === 'plans'
                  ? <><span className="font-semibold text-[#f3f0ed]/70">{t('plansSubheadingCount')}</span>{t('plansSubheadingRest')}</>
                  : t('packagesSubheading')}
              </p>
              <div className="mt-1 flex items-center gap-4 text-[11px] text-[#f3f0ed]/30">
                {activeTab === 'plans' ? (
                  <>
                    <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" />{t('securePayment')}</span>
                    <span className="flex items-center gap-1.5"><CircleOff className="h-3 w-3" />{t('cancelAnytime')}</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5"><Coins className="h-3 w-3" />{t('accumulates')}</span>
                    <span className="flex items-center gap-1.5"><Zap className="h-3 w-3" />{t('instantDelivery')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Tab toggle */}
            {packages && packages.length > 0 && (
              <div className="flex justify-center">
                <div className="flex rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-1 gap-1">
                  <button
                    onClick={() => setActiveTab('plans')}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${activeTab === 'plans' ? 'bg-[#f3f0ed]/[0.1] text-[#f3f0ed] shadow-sm' : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70'}`}
                  >
                    <BadgePercent className="h-3.5 w-3.5" />
                    {t('tabPlans')}
                  </button>
                  <button
                    onClick={() => setActiveTab('credits')}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${activeTab === 'credits' ? 'bg-[#f3f0ed]/[0.1] text-[#f3f0ed] shadow-sm' : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70'}`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {t('tabCredits')}
                  </button>
                </div>
              </div>
            )}

            {/* Plans tab */}
            {activeTab === 'plans' && sortedPlans.length > 0 && (
              <>
                <PlansGrid
                  plans={sortedPlans}
                  currentPlanSlug={currentPlanSlug}
                  hasActiveSub={hasActiveSub}
                  subscribingSlug={subscribingSlug}
                  onSubscribe={handleSubscribe}
                />
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-[#f3f0ed]/25">
                  <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#a2dd00]/50" />{t('noCancelFee')}</span>
                  <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#a2dd00]/50" />{t('monthlyRenewal')}</span>
                </div>
              </>
            )}

            {/* Credits tab */}
            {activeTab === 'credits' && packages && packages.length > 0 && (
              <div id="boost-section" className="flex flex-col gap-6">
                <CreditPackagesGrid packages={packages} currency={uiCurrency} />
                <p className="text-center text-xs text-[#f3f0ed]/20">
                  {t('onePaymentFootnote')}
                </p>
              </div>
            )}
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
            lostBenefits.unshift(t('retentionCreditDiff', { count: numFmt.format(creditDiff) }));
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
            lostBenefits={lostBenefits.length > 0 ? lostBenefits : [t('retentionFallbackBenefit')]}
          />
        );
      })()}
    </div>
  );
}

export default function CreditosPage() {
  return (
    <Suspense>
      <CreditosPageContent />
    </Suspense>
  );
}
