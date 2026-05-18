'use client';

import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Flame,
  Flower2,
  Gem,
  Infinity as InfinityIcon,
  Loader2,
  Mountain,
  Pickaxe,
  Users,
  Zap,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { Plan } from '@/lib/api';
import {
  PLAN_DISCOUNT_LABELS,
  PLAN_ORDER,
  PLAN_ORIGINAL_PRICES,
  PLAN_SOCIAL_PROOF_ICONS,
  PLAN_UNLIMITED_FEATURE_KEYS,
  formatCurrency,
  getPlanFeatureKeys,
} from '@/lib/plans';

export interface PlansGridProps {
  plans: Plan[];
  currentPlanSlug: string | null;
  hasActiveSub: boolean;
  subscribingSlug: string | null;
  onSubscribe: (slug: string) => void;
  /** compact = modal style (5-col grid, smaller cards) | full = page style (3+2 layout, larger cards) */
  compact?: boolean;
  isLoading?: boolean;
}

function resolvePlanAction(
  targetSlug: string,
  currentPlanSlug: string | null,
  hasActiveSub: boolean,
): 'upgrade' | 'downgrade' | 'create' | 'current' {
  if (currentPlanSlug === targetSlug) return 'current';
  if (!hasActiveSub || !currentPlanSlug || currentPlanSlug === 'free') return 'create';
  const currentIdx = PLAN_ORDER.indexOf(currentPlanSlug);
  const targetIdx = PLAN_ORDER.indexOf(targetSlug);
  return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
}

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  planAction: 'upgrade' | 'downgrade' | 'create' | 'current';
  onSubscribe: (slug: string) => void;
  subscribingSlug: string | null;
  compact: boolean;
}

function PlanCard({ plan, isCurrent, planAction, onSubscribe, subscribingSlug, compact }: PlanCardProps) {
  const t = useTranslations('editorPlans');
  const locale = useLocale();
  const isFree = plan.priceCents === 0;
  const isCreator = plan.slug === 'creator';
  const isPro = plan.slug === 'pro';
  const isRecommended = plan.slug === 'pro';
  const isStudio = plan.slug === 'studio';

  const mainPrice = isFree
    ? t('free')
    : formatCurrency(plan.priceCents, plan.currency || 'BRL', locale);
  const subPrice = isFree ? null : t('perMonth');

  const isSubscribing = subscribingSlug === plan.slug;
  const featureEntries = getPlanFeatureKeys(plan);
  const isDowngrade = planAction === 'downgrade';
  const unlimitedFeatureKeys = PLAN_UNLIMITED_FEATURE_KEYS[plan.slug];
  const originalPrice = PLAN_ORIGINAL_PRICES[plan.slug];
  const discountLabel = PLAN_DISCOUNT_LABELS[plan.slug];
  const socialProofIcon = PLAN_SOCIAL_PROOF_ICONS[plan.slug];

  const subtitle = ['ultra-basic', 'starter', 'basic', 'creator', 'pro', 'advanced', 'studio'].includes(plan.slug)
    ? t(`subtitles.${plan.slug}` as 'subtitles.starter')
    : '';
  const hasSocialProof = ['free', 'ultra-basic', 'starter', 'basic', 'creator', 'pro', 'advanced', 'studio'].includes(plan.slug);
  const socialProofText = hasSocialProof
    ? t(`socialProof.${plan.slug}` as 'socialProof.free')
    : '';

  const actionLabel = t(`actions.${planAction}` as 'actions.upgrade');

  const isUltraBasic = plan.slug === 'ultra-basic';
  const isBasic = plan.slug === 'basic';
  const isAdvanced = plan.slug === 'advanced';
  const PlanIcon = isStudio ? Crown : isPro ? Zap : isAdvanced ? Gem : isCreator ? Pickaxe : isBasic ? Mountain : isUltraBasic ? Flower2 : isFree ? Users : Coins;
  const SocialProofIcon = socialProofIcon;
  const radius = compact ? 'rounded-[16px]' : 'rounded-[22px]';

  return (
    <div
      className={`group relative flex flex-col border transition-all duration-300 ${radius} ${isDowngrade
        ? 'border-[#f3f0ed]/5 bg-[#1c2527]/60 opacity-40 pointer-events-none'
        : isCurrent
          ? 'border-[#f3f0ed]/25 bg-[#1e2325] ring-1 ring-[#f3f0ed]/10'
          : isRecommended
            ? 'border-[#a2dd00]/30 bg-gradient-to-b from-[#1f2d20] to-[#1a2523] ring-1 ring-[#a2dd00]/15 shadow-[0_0_40px_rgba(162,221,0,0.08)] hover:shadow-[0_0_60px_rgba(162,221,0,0.12)]'
            : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.12] hover:bg-[#1a1f21]'
        }`}
    >
      {/* Creator top glow */}
      {isRecommended && !isDowngrade && (
        <>
          <div
            className={`pointer-events-none absolute -inset-px ${radius}`}
            style={{ background: 'linear-gradient(180deg, rgba(162,221,0,0.15) 0%, rgba(162,221,0,0) 50%)' }}
          />
          <div
            className={`pointer-events-none absolute -top-[1px] h-[2px] ${compact ? 'left-6 right-6' : 'left-8 right-8'}`}
            style={{ background: 'linear-gradient(90deg, transparent, rgba(162,221,0,0.6), transparent)' }}
          />
        </>
      )}

      {/* Current plan glow */}
      {isCurrent && !isRecommended && (
        <div
          className={`pointer-events-none absolute -inset-px ${radius} opacity-40`}
          style={{ background: 'linear-gradient(180deg, rgba(243,240,237,0.06) 0%, rgba(243,240,237,0) 35%)' }}
        />
      )}

      {/* Badge — current */}
      {isCurrent && (
        <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${compact ? '-top-2.5' : '-top-3'}`}>
          <div className={`flex items-center gap-1 rounded-full bg-[#f3f0ed] shadow-[0_0_16px_rgba(243,240,237,0.15)] ${compact ? 'px-3 py-0.5' : 'px-4 py-1'}`}>
            <Check className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-[#1a2123]`} />
            <span className={`font-bold uppercase tracking-[0.08em] text-[#1a2123] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{t('badges.yourPlan')}</span>
          </div>
        </div>
      )}

      {/* Badge — popular */}
      {isRecommended && !isCurrent && (
        <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${compact ? '-top-2.5' : '-top-3.5'}`}>
          <div className={`flex items-center gap-1 rounded-full bg-[#a2dd00] shadow-[0_0_30px_rgba(162,221,0,0.4)] ${compact ? 'px-3 py-1' : 'px-3.5 py-1.5'}`}>
            <Flame className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} text-[#141a1c]`} />
            <span className={`font-extrabold uppercase tracking-[0.08em] text-[#141a1c] ${compact ? 'text-[8px]' : 'text-[9px]'}`}>{t('badges.mostPopular')}</span>
          </div>
        </div>
      )}

      <div className={`relative flex flex-1 flex-col ${compact ? 'p-3' : 'p-5 sm:p-6'}`}>
        {/* Icon + name */}
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
          <div className={`flex items-center justify-center rounded-lg ${compact ? 'h-6 w-6' : 'h-8 w-8'} ${isRecommended ? 'bg-[#a2dd00]/15' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.05]'
            }`}>
            <PlanIcon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${isRecommended ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/70' : 'text-[#f3f0ed]/40'
              }`} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#f3f0ed]">{plan.name}</h3>
            <span className={`text-[#f3f0ed]/30 ${compact ? 'text-[11px]' : 'text-[10px]'} ${subtitle ? '' : 'invisible'}`}>
              {subtitle || '\u00A0'}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className={`${compact ? 'mt-2.5 min-h-[42px]' : 'mt-5 min-h-[60px]'}`}>
          {originalPrice && !isFree ? (
            <div className={`flex items-center gap-1 ${compact ? 'mb-0.5' : 'mb-1'}`}>
              <span className="text-[12px] text-[#f3f0ed]/25 line-through">
                {formatCurrency(originalPrice, plan.currency || 'BRL', locale)}
              </span>
              {discountLabel && (
                <span className={`rounded bg-[#a2dd00]/15 font-bold text-[#a2dd00] ${compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[9px]'}`}>
                  {discountLabel}
                </span>
              )}
            </div>
          ) : (
            <div className={`invisible ${compact ? 'mb-0.5' : 'mb-1'}`}>
              <span className="text-[12px]">&nbsp;</span>
            </div>
          )}
          <div className="flex items-baseline gap-0.5">
            <span className={`text-[22px] font-extrabold leading-none tracking-tight ${isFree ? 'text-[#a2dd00]' : isRecommended ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {mainPrice}
            </span>
            {subPrice && <span className={`text-[#f3f0ed]/30 ${compact ? 'text-[12px]' : 'text-[11px]'}`}>{subPrice}</span>}
          </div>
        </div>

        {/* Credits */}
        <div className={`flex items-center gap-1.5 rounded-lg border ${compact ? 'mt-2 px-2.5 py-1.5' : 'mt-4 rounded-xl px-3.5 py-2.5'} ${isRecommended ? 'bg-[#a2dd00]/10 border-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.03] border-[#f3f0ed]/[0.05]'
          }`}>
          <Coins className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${isRecommended ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
          <div>
            <span className={`font-extrabold tabular-nums ${compact ? 'text-[15px]' : 'text-[16px]'} ${isRecommended ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {plan.creditsPerMonth.toLocaleString(locale)}
            </span>
            <span className={`ml-1 text-[#f3f0ed]/30 ${compact ? 'text-[12px]' : 'text-[11px]'}`}>
              {isFree ? t('credits') : t('creditsPerMonth')}
            </span>
          </div>
        </div>


        {/* Social proof */}
        {SocialProofIcon && !isDowngrade && (
          <p className={`flex items-center gap-1.5 font-medium text-[#a2dd00]/70 ${compact ? 'mt-1.5 text-[12px]' : 'mt-3 text-[11px]'}`}>
            <SocialProofIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {socialProofText}
          </p>
        )}

        {/* Divider */}
        <div className={`h-px w-full bg-[#f3f0ed]/[0.06] ${compact ? 'my-2' : 'my-4'}`} />

        {/* Features */}
        <ul className={`flex flex-col ${compact ? 'min-h-[70px] gap-1.5' : 'min-h-[110px] gap-2.5'}`}>
          {featureEntries.map((entry) => {
            const label = t(
              entry.key as 'features.emailSupport',
              entry.values as Record<string, number | string> | undefined,
            );
            return (
              <li key={entry.key} className={`flex items-start ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
                <div className={`shrink-0 flex items-center justify-center rounded-full ${compact ? 'mt-[1px] h-[12px] w-[12px]' : 'mt-[2px] h-[16px] w-[16px]'
                  } ${isRecommended ? 'bg-[#a2dd00]/20' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.06]'
                  }`}>
                  <Check className={`${compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'} ${isRecommended ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/60' : 'text-[#f3f0ed]/45'
                    }`} />
                </div>
                <span className="text-[12px] leading-snug text-[#f3f0ed]/55">{label}</span>
              </li>
            );
          })}
        </ul>

        <div className="flex-1" />

        {/* Modo Ilimitado (somente planos elegíveis) — fixado no bottom */}
        {unlimitedFeatureKeys && unlimitedFeatureKeys.length > 0 && (
          <div
            className={`unlimited-shimmer-border flex flex-col gap-1.5 rounded-xl border px-3 py-2 ${compact ? 'mt-2' : 'mt-3'}`}
            style={{
              borderColor: 'rgba(168,85,247,0.25)',
              background: 'rgba(168,85,247,0.06)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <InfinityIcon className="h-3 w-3 text-[#a855f7]" />
              <span className={`font-bold uppercase tracking-[0.1em] text-[#a855f7] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                {t('unlimited.modeBadge')}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {unlimitedFeatureKeys.map((key) => (
                <li
                  key={key}
                  className={`flex items-start gap-1 text-[#f3f0ed]/75 ${compact ? 'text-[10.5px]' : 'text-[11px]'}`}
                >
                  <Check className="mt-[2px] h-2.5 w-2.5 shrink-0 text-[#a855f7]" />
                  <span>{t(`unlimited.features.${key}` as 'unlimited.features.veoFast720')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        {isFree && <div className={compact ? 'mt-3 h-8' : 'mt-6 h-11'} />}
        {!isFree && !isDowngrade && (
          <button
            disabled={isCurrent || !!subscribingSlug}
            onClick={() => onSubscribe(plan.slug)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl font-bold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'mt-3 h-8 text-[13px]' : 'mt-6 h-11 text-[13px]'
              } ${isCurrent
                ? 'bg-[#f3f0ed]/10 text-[#f3f0ed]/60'
                : isRecommended
                  ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_4px_20px_rgba(162,221,0,0.3)] hover:shadow-[0_4px_30px_rgba(162,221,0,0.4)] hover:brightness-110'
                  : 'border border-[#f3f0ed]/[0.1] bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/80 hover:border-[#f3f0ed]/[0.2] hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]'
              }`}
          >
            {isSubscribing ? (
              <Loader2 className={`animate-spin ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
            ) : (
              <>
                {actionLabel}
                {!isCurrent && <ArrowRight className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonCard({ compact }: { compact: boolean }) {
  const radius = compact ? 'rounded-[16px]' : 'rounded-[22px]';
  const padding = compact ? 'p-3' : 'p-5';
  return (
    <div className={`animate-pulse border border-[#f3f0ed]/[0.06] bg-[#171e20] ${radius} ${padding}`}>
      <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        <div className={`${compact ? 'h-6 w-6 rounded-md' : 'h-8 w-8 rounded-lg'} bg-[#f3f0ed]/[0.06]`} />
        <div className={`${compact ? 'h-4 w-16' : 'h-5 w-24'} rounded bg-[#f3f0ed]/[0.06]`} />
      </div>
      <div className={`${compact ? 'mt-3 h-6 w-20' : 'mt-5 h-7 w-28'} rounded bg-[#f3f0ed]/[0.06]`} />
      <div className={`${compact ? 'mt-2 h-10' : 'mt-4 h-12'} rounded-lg bg-[#f3f0ed]/[0.04]`} />
      <div className={`h-px bg-[#f3f0ed]/[0.05] ${compact ? 'my-2.5' : 'my-4'}`} />
      <div className="flex flex-col gap-2">
        {[75, 60, 85].map((w, i) => (
          <div key={i} className={`${compact ? 'h-3' : 'h-3.5'} rounded bg-[#f3f0ed]/[0.05]`} style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className={`${compact ? 'mt-4 h-8' : 'mt-6 h-11'} rounded-xl bg-[#f3f0ed]/[0.06]`} />
    </div>
  );
}

const PLAN_SECTIONS = [
  { key: 'entry' as const, slugs: ['ultra-basic', 'starter', 'basic', 'creator'] },
  { key: 'monetizer' as const, slugs: ['pro', 'advanced', 'studio'] },
];

function PlanSection({
  sectionKey,
  plans,
  currentPlanSlug,
  hasActiveSub,
  subscribingSlug,
  onSubscribe,
  compact,
  cols = 3,
}: {
  sectionKey: 'entry' | 'creator' | 'monetizer';
  plans: Plan[];
  currentPlanSlug: string | null;
  hasActiveSub: boolean;
  subscribingSlug: string | null;
  onSubscribe: (slug: string) => void;
  compact: boolean;
  cols?: 2 | 3 | 4;
}) {
  const t = useTranslations('editorPlans');
  const gap = compact ? 'gap-3' : 'gap-4 lg:gap-3';
  const colClass = cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-[#f3f0ed]/[0.08]" />
        <p className={`font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/50 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          {t(`planSections.${sectionKey}` as 'planSections.entry')}
        </p>
        <div className="h-px flex-1 bg-[#f3f0ed]/[0.08]" />
      </div>
      <div className={`grid grid-cols-1 items-stretch ${colClass} ${gap}`}>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={currentPlanSlug === plan.slug}
            planAction={resolvePlanAction(plan.slug, currentPlanSlug, hasActiveSub)}
            onSubscribe={onSubscribe}
            subscribingSlug={subscribingSlug}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

export function PlansGrid({
  plans,
  currentPlanSlug,
  hasActiveSub,
  subscribingSlug,
  onSubscribe,
  compact = false,
  isLoading = false,
}: PlansGridProps) {
  if (isLoading) {
    return (
      <div className={`flex flex-col ${compact ? 'gap-4' : 'gap-6'}`}>
        {PLAN_SECTIONS.map((section) => (
          <div key={section.key} className="flex flex-col gap-2">
            <div className={`${compact ? 'h-2.5 w-24' : 'h-3 w-32'} rounded bg-[#f3f0ed]/[0.06]`} />
            <div className={`grid grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3 ${compact ? 'gap-3' : 'gap-4 lg:gap-3'}`}>
              {section.slugs.map((_, i) => <SkeletonCard key={i} compact={compact} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Ordena do mais caro para o mais barato.
  const sorted = plans
    .filter((p) => p.slug !== 'free')
    .slice()
    .sort((a, b) => PLAN_ORDER.indexOf(b.slug) - PLAN_ORDER.indexOf(a.slug));

  if (sorted.length === 0) return null;

  const entryPlans = sorted.filter((p) => PLAN_SECTIONS[0].slugs.includes(p.slug));
  const monetizerPlans = sorted.filter((p) => PLAN_SECTIONS[1].slugs.includes(p.slug));

  return (
    <div className={`flex flex-col ${compact ? 'gap-4' : 'gap-6'}`}>
      {monetizerPlans.length > 0 && (
        <PlanSection
          sectionKey="monetizer"
          plans={monetizerPlans}
          currentPlanSlug={currentPlanSlug}
          hasActiveSub={hasActiveSub}
          subscribingSlug={subscribingSlug}
          onSubscribe={onSubscribe}
          compact={compact}
          cols={3}
        />
      )}
      {entryPlans.length > 0 && (
        <PlanSection
          sectionKey="entry"
          plans={entryPlans}
          currentPlanSlug={currentPlanSlug}
          hasActiveSub={hasActiveSub}
          subscribingSlug={subscribingSlug}
          onSubscribe={onSubscribe}
          compact={compact}
          cols={4}
        />
      )}
    </div>
  );
}
