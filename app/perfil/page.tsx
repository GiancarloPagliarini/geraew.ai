'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
  CreditCard,
  Crown,
  CalendarDays,
  ExternalLink,
  User,
  Coins,
  Settings,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLoginModal } from '@/lib/login-modal-context';
import { useEffect, useState } from 'react';
import { ManageSubscriptionModal } from '@/components/editor/ManageSubscriptionModal';
import { useLocale, useTranslations } from 'next-intl';

export default function PerfilPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const loadingMsg = useLoadingMessage('perfil');
  const queryClient = useQueryClient();
  const [showManageModal, setShowManageModal] = useState(false);
  const t = useTranslations('account.profile');
  const tCommon = useTranslations('account.common');
  const locale = useLocale();

  const reactivateMutation = useMutation({
    mutationFn: () => api.subscriptions.reactivate(accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success(t('reactivateSuccessTitle'), { description: t('reactivateSuccessDescription') });
    },
    onError: () => toast.error(t('reactivateErrorTitle'), { description: t('reactivateErrorDescription') }),
  });

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
  });

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      openLoginModal();
    }
  }, [authLoading, user, router]);

  if (authLoading || isLoading || balanceLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a2123] px-4">
        <div className="w-full max-w-md text-center">
          <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error instanceof Error ? error.message : t('errorLoading')}
          </p>
          <button
            onClick={() => router.push('/workspace')}
            className="mt-4 text-sm text-[#a2dd00]/70 hover:text-[#a2dd00]"
          >
            {tCommon('backToEditor')}
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const dateLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
  const createdAt = new Date(profile.createdAt).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Credits
  const totalCredits = balance
    ? balance.totalCreditsAvailable + balance.planCreditsUsed
    : 0;
  const usagePercent =
    totalCredits > 0 ? (balance!.planCreditsUsed / totalCredits) * 100 : 0;
  const periodStart = balance
    ? new Date(balance.periodStart).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })
    : '';
  const periodEnd = balance
    ? new Date(balance.periodEnd).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short' })
    : '';

  // Plan
  const plan = profile.plan as Record<string, unknown> | null;
  const planName = (plan?.name as string) || (plan?.planName as string) || null;
  const planSlug = (plan?.slug as string) || null;
  const planStatus = (plan?.status as string) || null;
  const isFreeUser = planSlug === 'free' || !planSlug;

  // Subscription
  const sub = profile.subscription as Record<string, unknown> | null;
  const subStatus = (sub?.status as string) || null;
  const cancelAtPeriodEnd = (sub?.cancelAtPeriodEnd as boolean) || false;
  const subEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd as string).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    : null;

  const statusColor = (s: string | null) => {
    if (!s) return 'text-[#f3f0ed]/40';
    const lower = s.toLowerCase();
    if (lower === 'active' || lower === 'ativo') return 'text-green-400';
    if (lower === 'trialing') return 'text-yellow-400';
    if (lower === 'canceled' || lower === 'cancelado') return 'text-red-400';
    return 'text-[#f3f0ed]/60';
  };

  const statusLabel = (s: string | null) => {
    if (!s) return t('status.empty');
    const map: Record<string, string> = {
      active: t('status.active'),
      ativo: t('status.active'),
      trialing: t('status.trialing'),
      canceled: t('status.canceled'),
      cancelado: t('status.canceled'),
      past_due: t('status.pastDue'),
      inactive: t('status.inactive'),
    };
    return map[s.toLowerCase()] ?? s;
  };

  const numFmt = new Intl.NumberFormat(dateLocale);

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#f3f0ed]/[0.07] px-4">
        <button
          onClick={() => router.push('/workspace')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon('backToEditor')}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-linear-to-br from-[#f3f0ed]/4 to-[#a2dd00]/4 p-6">
          {/* accent blob */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#a2dd00]/7 blur-2xl" />

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={typeof profile.avatarUrl === 'string' ? profile.avatarUrl : ''}
                  alt={profile.name}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#a2dd00]/20 text-2xl font-bold text-[#a2dd00]">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
              {/* verified dot */}
              {profile.emailVerified && (
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1a2123] bg-green-400">
                  <CheckCircle className="h-3 w-3 text-[#1a2123]" />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-[#f3f0ed]">{profile.name}</h1>
              <p className="mt-0.5 text-sm text-[#f3f0ed]/50">{profile.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {/* Plan badge */}
                {planName && (
                  <span className="flex items-center gap-1 rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-2.5 py-0.5 text-[11px] font-bold text-[#a2dd00]">
                    <Crown className="h-3 w-3" />
                    {planName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Member since */}
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[#f3f0ed]/30">
            <Calendar className="h-3.5 w-3.5" />
            {t('memberSince', { date: createdAt })}
          </div>
        </div>

        {/* ── Créditos ── */}
        <div>
          <SectionHeader
            icon={Coins}
            title={t('credits')}
            action={
              <button
                onClick={() => router.push('/creditos')}
                className="flex items-center gap-1 text-xs text-[#a2dd00]/60 transition-colors hover:text-[#a2dd00]"
              >
                {t('viewDetails')}
                <ExternalLink className="h-3 w-3" />
              </button>
            }
          />

          {balance ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* Disponiveis */}
              <div className="col-span-2 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/6 p-4 sm:col-span-1">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#a2dd00]/60">{t('available')}</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-[#a2dd00]">
                  {isFreeUser ? '30' : numFmt.format(balance.totalCreditsAvailable)}
                </p>
                {isFreeUser && (
                  <p className="mt-1 text-[11px] text-[#a2dd00]/50">{t('creditsLabel')}</p>
                )}
              </div>

              {/* Plano */}
              <div className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#f3f0ed]/40">{t('fromPlan')}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#f3f0ed]">
                  {isFreeUser ? '30' : numFmt.format(balance.planCreditsRemaining)}
                </p>
              </div>

              {/* Bonus */}
              <div className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-4">
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#f3f0ed]/40">{t('bonus')}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#f3f0ed]">
                  {numFmt.format(balance.bonusCreditsRemaining)}
                </p>
              </div>

              {/* Usage bar — full width */}
              <div className="col-span-2 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-4 sm:col-span-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold tracking-[0.12em]">{t('usageInPeriod')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#f3f0ed]/40">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {isFreeUser ? t('daily') : `${periodStart} \u2014 ${periodEnd}`}
                    </span>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#f3f0ed]/10">
                  <div
                    className="h-full rounded-full bg-[#a2dd00] transition-all"
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#f3f0ed]/30">
                  <span>{t('creditsUsed', { count: numFmt.format(balance.planCreditsUsed) })}</span>
                  <span>{usagePercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={Zap} text={t('creditsUnavailable')} />
          )}
        </div>

        {/* ── Plano & Assinatura ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Plano */}
          <div className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-4">
            <div className="flex items-center gap-2 text-[#f3f0ed]/40">
              <Crown className="h-4 w-4" />
              <span className="text-[10px] font-bold tracking-[0.12em]">{t('plan')}</span>
            </div>
            {plan && planName ? (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-base font-bold text-[#f3f0ed]">{planName}</p>
                {planStatus && (
                  <span className={`text-xs font-medium ${statusColor(planStatus)}`}>
                    {statusLabel(planStatus)}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#f3f0ed]/30">{t('noActivePlan')}</p>
            )}
          </div>

          {/* Assinatura */}
          <div className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-4">
            <div className="flex items-center gap-2 text-[#f3f0ed]/40">
              <CreditCard className="h-4 w-4" />
              <span className="text-[10px] font-bold tracking-[0.12em]">{t('subscription')}</span>
            </div>
            {sub && subStatus ? (
              <div className="mt-3 flex flex-col gap-2">
                <span className={`text-sm font-bold ${statusColor(subStatus)}`}>
                  {statusLabel(subStatus)}
                </span>
                {subEnd && (
                  <p className="text-xs text-[#f3f0ed]/40">{t('renewsOn', { date: subEnd })}</p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#f3f0ed]/30">{t('noActiveSubscription')}</p>
            )}
          </div>
        </div>

        {/* ── Gerenciar Assinatura ── */}
        <button
          onClick={() => setShowManageModal(true)}
          className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-4 py-3.5 text-left transition-colors hover:border-[#a2dd00]/20 hover:bg-[#a2dd00]/[0.04]"
        >
          <Settings className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
          <span className="flex-1 text-sm font-medium text-[#f3f0ed]">{t('manageSubscription')}</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#f3f0ed]/30" />
        </button>

        {/* ── Conta ── */}
        <div>
          <SectionHeader icon={User} title={t('account')} />
          <div className="mt-3 flex flex-col gap-2">
            <InfoRow icon={Mail} label={t('email')} value={profile.email} />
            <InfoRow
              icon={profile.emailVerified ? CheckCircle : XCircle}
              label={t('emailVerified')}
              value={profile.emailVerified ? t('verified') : t('notVerified')}
              valueColor={profile.emailVerified ? 'text-green-400' : 'text-red-400'}
            />
            <InfoRow icon={Calendar} label={t('memberSinceLabel')} value={createdAt} />
          </div>
        </div>

        {/* Cancelamento agora é feito dentro de "Gerenciar assinatura" */}
        {sub && subStatus?.toLowerCase() === 'active' && cancelAtPeriodEnd && (
          <div className="flex flex-col gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#f3f0ed]/50">
                {t('scheduledToCancel')}
              </p>
              {subEnd && (
                <p className="text-xs text-[#f3f0ed]/35">
                  {t('accessUntil', { date: subEnd })}
                </p>
              )}
            </div>
            <button
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
              className="flex h-9 w-fit items-center gap-2 rounded-xl bg-[#a2dd00] px-4 text-xs font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reactivateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('reactivateSubscription')}
            </button>
          </div>
        )}

        {/* Manage subscription modal */}
        {showManageModal && (
          <ManageSubscriptionModal onClose={() => setShowManageModal(false)} />
        )}


      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Sparkles;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#a2dd00]/70" />
        <h2 className="text-sm font-bold text-[#f3f0ed]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-[#a2dd00]/50" />
      <span className="flex-1 text-xs text-[#f3f0ed]/40">{label}</span>
      <span className={`text-xs font-medium ${valueColor ?? 'text-[#f3f0ed]'}`}>{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Zap; text: string }) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 py-8 text-[#f3f0ed]/20">
      <Icon className="h-5 w-5" />
      <p className="text-xs">{text}</p>
    </div>
  );
}
