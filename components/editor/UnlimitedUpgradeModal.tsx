'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  Crown,
  Gem,
  Infinity as InfinityIcon,
  Loader2,
  Pickaxe,
  Sparkle,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/plans';

interface UnlimitedUpgradeModalProps {
  onClose: () => void;
}

interface UnlimitedPlanCopy {
  slug: string;
  name: string;
  icon: LucideIcon;
  /** Chaves de tradução dentro de `editorPlans.unlimited.features.*`. */
  featureKeys: string[];
  mostPopular?: boolean;
}

const UNLIMITED_PLAN_COPY: UnlimitedPlanCopy[] = [
  {
    slug: 'creator',
    name: 'Creator',
    icon: Pickaxe,
    featureKeys: ['veoFast720'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    icon: Zap,
    featureKeys: ['veoFast720And1080'],
  },
  {
    slug: 'advanced',
    name: 'Advanced',
    icon: Gem,
    mostPopular: true,
    featureKeys: ['veoBoth720', 'nb2_1K'],
  },
  {
    slug: 'studio',
    name: 'Studio',
    icon: Crown,
    featureKeys: ['veoBoth720And1080', 'nbBoth1K'],
  },
];

export function UnlimitedUpgradeModal({ onClose }: UnlimitedUpgradeModalProps) {
  const { accessToken } = useAuth();
  const locale = useLocale();
  const t = useTranslations('editorPlans.unlimited');
  const uiCurrency = locale === 'pt-BR' ? 'BRL' : 'USD';
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans', uiCurrency],
    queryFn: () => api.plans.list(accessToken!, uiCurrency),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubscribe(slug: string) {
    if (!accessToken || subscribingSlug) return;
    setSubscribingSlug(slug);
    try {
      const res = await api.subscriptions.create(accessToken, slug, uiCurrency);
      window.location.href = res.checkoutUrl;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        try {
          const res = await api.subscriptions.upgrade(accessToken, slug, uiCurrency);
          window.location.href = res.checkoutUrl;
        } catch {
          toast.error(t('checkoutError'));
          setSubscribingSlug(null);
        }
      } else {
        toast.error(t('checkoutError'));
        setSubscribingSlug(null);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-4 flex max-h-[92vh] w-full max-w-5xl flex-col gap-6 overflow-hidden rounded-[24px] border border-[#a855f7]/20 bg-[#161018] p-5 shadow-2xl sm:p-8">
        {/* Background ornaments */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
          <div className="absolute -top-32 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-[#a855f7] opacity-[0.18] blur-3xl" />
          <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[#7c3aed] opacity-[0.10] blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#c084fc] opacity-[0.08] blur-3xl" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero */}
        <div className="relative z-10 flex flex-col items-center gap-3 pt-1 text-center">
          <div className="flex items-center gap-1.5 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/15 px-3.5 py-1 shadow-[0_0_24px_-4px_rgba(168,85,247,0.6)]">
            <InfinityIcon className="h-3 w-3 text-[#d8b4fe]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d8b4fe]">
              {t('modeBadge')}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold leading-tight text-[#f3f0ed] sm:text-3xl">
            {t('modalTitle')}
          </h2>
          <p className="max-w-md text-[13px] leading-relaxed text-[#f3f0ed]/55">
            {t('modalSubtitlePrefix')}
            <span className="font-semibold text-[#d8b4fe]">{t('modalSubtitleHighlight')}</span>
            {t('modalSubtitleSuffix')}
          </p>
        </div>

        {/* Plans grid */}
        <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {UNLIMITED_PLAN_COPY.map((p) => {
            const planData = plans?.find((pl) => pl.slug === p.slug);
            const PlanIcon = p.icon;
            const isMostPopular = !!p.mostPopular;

            return (
              <div
                key={p.slug}
                className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition-all hover:translate-y-[-2px] ${isMostPopular ? 'unlimited-shimmer-border' : ''
                  }`}
                style={{
                  borderColor: isMostPopular
                    ? 'rgba(168,85,247,0.35)'
                    : 'rgba(243,240,237,0.07)',
                  background: isMostPopular
                    ? 'linear-gradient(180deg, rgba(168,85,247,0.10) 0%, rgba(168,85,247,0.04) 100%)'
                    : 'rgba(243,240,237,0.02)',
                  boxShadow: isMostPopular
                    ? '0 0 32px -8px rgba(168,85,247,0.35)'
                    : undefined,
                }}
              >
                {isMostPopular && (
                  <div className="absolute -top-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-[#a855f7] to-[#c084fc] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_12px_rgba(168,85,247,0.5)]">
                    <Sparkle className="h-2.5 w-2.5 fill-white" />
                    {t('mostPopular')}
                  </div>
                )}

                {/* Icon + name + tagline */}
                <div className="flex items-start gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isMostPopular ? 'bg-[#a855f7]/20' : 'bg-[#f3f0ed]/[0.05]'
                      }`}
                  >
                    <PlanIcon
                      className={`h-4 w-4 ${isMostPopular ? 'text-[#d8b4fe]' : 'text-[#f3f0ed]/55'}`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[15px] font-bold text-[#f3f0ed]">{p.name}</div>
                    <div className="text-[10px] leading-tight text-[#f3f0ed]/40">
                      {t(`taglines.${p.slug}` as 'taglines.creator')}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  {isLoading || !planData ? (
                    <div className="h-7 w-24 animate-pulse rounded bg-[#f3f0ed]/[0.06]" />
                  ) : (
                    <>
                      <span className="text-[26px] font-extrabold leading-none tracking-tight text-[#f3f0ed]">
                        {formatCurrency(
                          planData.priceCents,
                          planData.currency || 'BRL',
                          locale,
                        )}
                      </span>
                      <span className="text-[11px] text-[#f3f0ed]/35">/mês</span>
                    </>
                  )}
                </div>

                {/* Highlights */}
                <ul className="flex flex-col gap-1.5">
                  {p.featureKeys.map((key) => (
                    <li key={key} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <div
                        className={`mt-[1px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${isMostPopular ? 'bg-[#a855f7]/25' : 'bg-[#f3f0ed]/[0.05]'
                          }`}
                      >
                        <Check
                          className={`h-2 w-2 ${isMostPopular ? 'text-[#d8b4fe]' : 'text-[#a855f7]/70'}`}
                        />
                      </div>
                      <span className="text-[#f3f0ed]/75">
                        {t(`features.${key}` as 'features.veoFast720')}
                      </span>
                    </li>
                  ))}

                  <li className="flex items-start gap-1.5 text-[11px] leading-snug">
                    <div
                      className={`mt-[1px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${isMostPopular ? 'bg-[#a855f7]/25' : 'bg-[#f3f0ed]/[0.05]'
                        }`}
                    >
                      <Check
                        className={`h-2 w-2 ${isMostPopular ? 'text-[#d8b4fe]' : 'text-[#a855f7]/70'}`}
                      />
                    </div>
                    <span className="text-[#f3f0ed]/90">
                      {t('allIncluded', { plan: p.name })}
                    </span>
                  </li>
                </ul>

                <div className="flex-1" />

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(p.slug)}
                  disabled={subscribingSlug !== null}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-bold transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: isMostPopular
                      ? 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)'
                      : 'rgba(168,85,247,0.1)',
                    border: isMostPopular
                      ? 'none'
                      : '1px solid rgba(168,85,247,0.3)',
                    color: isMostPopular ? '#ffffff' : '#d8b4fe',
                    boxShadow: isMostPopular ? '0 4px 16px rgba(168,85,247,0.35)' : undefined,
                  }}
                >
                  {subscribingSlug === p.slug ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      {t('subscribe', { plan: p.name })}
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer reassurance */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10.5px] text-[#f3f0ed]/35">
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a855f7]/60" />
            {t('cancelAnytime')}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a855f7]/60" />
            {t('noCommitment')}
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-2.5 w-2.5 text-[#a855f7]/60" />
            {t('securePayment')}
          </span>
        </div>
      </div>
    </div>
  );
}
