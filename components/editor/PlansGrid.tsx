'use client';

import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Flame,
  Loader2,
  Pickaxe,
  Users,
  Zap,
} from 'lucide-react';
import type { Plan } from '@/lib/api';
import {
  PLAN_DISCOUNT_LABELS,
  PLAN_GENERATIONS,
  PLAN_ORDER,
  PLAN_ORIGINAL_PRICES,
  PLAN_SOCIAL_PROOF,
  PLAN_SUBTITLES,
  formatPrice,
  formatPriceRaw,
  getPlanFeatures,
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

  const PlanIcon = isStudio ? Crown : isPro ? Zap : isCreator ? Pickaxe : isFree ? Users : Coins;
  const radius = compact ? 'rounded-[16px]' : 'rounded-[22px]';

  return (
    <div
      className={`group relative flex flex-col border transition-all duration-300 ${radius} ${isDowngrade
        ? 'border-[#f3f0ed]/5 bg-[#1c2527]/60 opacity-40 pointer-events-none'
        : isCurrent
          ? 'border-[#f3f0ed]/25 bg-[#1e2325] ring-1 ring-[#f3f0ed]/10'
          : isCreator
            ? 'border-[#a2dd00]/30 bg-gradient-to-b from-[#1f2d20] to-[#1a2523] ring-1 ring-[#a2dd00]/15 shadow-[0_0_40px_rgba(162,221,0,0.08)] hover:shadow-[0_0_60px_rgba(162,221,0,0.12)]'
            : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.12] hover:bg-[#1a1f21]'
        }`}
    >
      {/* Creator top glow */}
      {isCreator && !isDowngrade && (
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
      {isCurrent && !isCreator && (
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
            <span className={`font-bold uppercase tracking-[0.08em] text-[#1a2123] ${compact ? 'text-[8px]' : 'text-[10px]'}`}>Seu Plano</span>
          </div>
        </div>
      )}

      {/* Badge — popular */}
      {isCreator && !isCurrent && (
        <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${compact ? '-top-2.5' : '-top-3.5'}`}>
          <div className={`flex items-center gap-1 rounded-full bg-[#a2dd00] shadow-[0_0_30px_rgba(162,221,0,0.4)] ${compact ? 'px-3 py-1' : 'px-3.5 py-1.5'}`}>
            <Flame className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} text-[#141a1c]`} />
            <span className={`font-extrabold uppercase tracking-[0.08em] text-[#141a1c] ${compact ? 'text-[8px]' : 'text-[9px]'}`}>Mais Popular</span>
          </div>
        </div>
      )}

      <div className={`relative flex flex-1 flex-col ${compact ? 'p-3' : 'p-5 sm:p-6'}`}>
        {/* Icon + name */}
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
          <div className={`flex items-center justify-center rounded-lg ${compact ? 'h-6 w-6' : 'h-8 w-8'} ${isCreator ? 'bg-[#a2dd00]/15' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.05]'
            }`}>
            <PlanIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/70' : 'text-[#f3f0ed]/40'
              }`} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#f3f0ed]">{plan.name}</h3>
            <span className={`text-[#f3f0ed]/30 ${compact ? 'text-[11px]' : 'text-[10px]'} ${PLAN_SUBTITLES[plan.slug] ? '' : 'invisible'}`}>
              {PLAN_SUBTITLES[plan.slug] || '\u00A0'}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className={`${compact ? 'mt-2.5 min-h-[42px]' : 'mt-5 min-h-[60px]'}`}>
          {originalPrice && !isFree ? (
            <div className={`flex items-center gap-1 ${compact ? 'mb-0.5' : 'mb-1'}`}>
              <span className="text-[12px] text-[#f3f0ed]/25 line-through">
                {formatPriceRaw(originalPrice)}
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
            <span className={`text-[22px] font-extrabold leading-none tracking-tight ${isFree ? 'text-[#a2dd00]' : isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {main}
            </span>
            {sub && <span className={`text-[#f3f0ed]/30 ${compact ? 'text-[12px]' : 'text-[11px]'}`}>{sub}</span>}
          </div>
        </div>

        {/* Credits */}
        <div className={`flex items-center gap-1.5 rounded-lg border ${compact ? 'mt-2 px-2.5 py-1.5' : 'mt-4 rounded-xl px-3.5 py-2.5'} ${isCreator ? 'bg-[#a2dd00]/10 border-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.03] border-[#f3f0ed]/[0.05]'
          }`}>
          <Coins className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
          <div>
            <span className={`font-extrabold tabular-nums ${compact ? 'text-[15px]' : 'text-[16px]'} ${isCreator ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
              }`}>
              {isFree ? plan.creditsPerMonth : plan.creditsPerMonth.toLocaleString('pt-BR')}
            </span>
            <span className={`ml-1 text-[#f3f0ed]/30 ${compact ? 'text-[12px]' : 'text-[11px]'}`}>
              créditos{isFree ? '' : '/mês'}
            </span>
          </div>
        </div>

        {/* Social proof */}
        {socialProof && !isDowngrade && (
          <p className={`flex items-center gap-1.5 font-medium text-[#a2dd00]/70 ${compact ? 'mt-1.5 text-[12px]' : 'mt-3 text-[11px]'}`}>
            <socialProof.icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {socialProof.text}
          </p>
        )}

        {/* Divider */}
        <div className={`h-px w-full bg-[#f3f0ed]/[0.06] ${compact ? 'my-2' : 'my-4'}`} />

        {/* Features */}
        <ul className={`flex flex-col ${compact ? 'min-h-[70px] gap-1.5' : 'min-h-[110px] gap-2.5'}`}>
          {features.map((f) => (
            <li key={f} className={`flex items-start ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
              <div className={`shrink-0 flex items-center justify-center rounded-full ${compact ? 'mt-[1px] h-[12px] w-[12px]' : 'mt-[2px] h-[16px] w-[16px]'
                } ${isCreator ? 'bg-[#a2dd00]/20' : isCurrent ? 'bg-[#f3f0ed]/10' : 'bg-[#f3f0ed]/[0.06]'
                }`}>
                <Check className={`${compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5'} ${isCreator ? 'text-[#a2dd00]' : isCurrent ? 'text-[#f3f0ed]/60' : 'text-[#f3f0ed]/45'
                  }`} />
              </div>
              <span className="text-[12px] leading-snug text-[#f3f0ed]/55">{f}</span>
            </li>
          ))}
        </ul>

        {/* Generation examples */}
        <div className={`flex flex-col gap-0.5 ${compact ? 'mt-2 min-h-[65px]' : 'mt-4 min-h-[100px]'}`}>
          {generationExamples.length > 0 && (
            <>
              <p className={`font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/20 ${compact ? 'text-[10px]' : 'text-[9px]'}`}>
                O que dá pra criar
              </p>
              {generationExamples.map((ex) => (
                <div key={ex.label} className="flex items-center justify-between">
                  <span className={`text-[#f3f0ed]/35 ${compact ? 'text-[11px]' : 'text-[10px]'}`}>{ex.label}</span>
                  <span className={`font-semibold ${compact ? 'text-[11px]' : 'text-[10px]'} ${isCreator ? 'text-[#a2dd00]/60' : isCurrent ? 'text-[#f3f0ed]/55' : 'text-[#f3f0ed]/45'
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
        {isFree && <div className={compact ? 'mt-3 h-8' : 'mt-6 h-11'} />}
        {!isFree && !isDowngrade && (
          <button
            disabled={isCurrent || !!subscribingSlug}
            onClick={() => onSubscribe(plan.slug)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl font-bold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${compact ? 'mt-3 h-8 text-[13px]' : 'mt-6 h-11 text-[13px]'
              } ${isCurrent
                ? 'bg-[#f3f0ed]/10 text-[#f3f0ed]/60'
                : isCreator
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
    if (compact) {
      return (
        <>
          <div className="grid grid-cols-1 items-stretch gap-3 sm:hidden">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} compact />)}
          </div>
          <div className="hidden items-stretch gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} compact />)}
          </div>
        </>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} compact={false} />)}
        </div>
      </div>
    );
  }

  const sorted = plans.slice().sort((a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug));

  if (sorted.length === 0) return null;

  const mobileSorted = sorted.slice().sort((a, b) => {
    if (a.slug === 'creator') return -1;
    if (b.slug === 'creator') return 1;
    return 0;
  });

  if (compact) {
    return (
      <>
        <div className="grid grid-cols-1 items-stretch gap-3 sm:hidden">
          {mobileSorted.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlanSlug === plan.slug}
              planAction={resolvePlanAction(plan.slug, currentPlanSlug, hasActiveSub)}
              onSubscribe={onSubscribe}
              subscribingSlug={subscribingSlug}
              compact
            />
          ))}
        </div>
        <div className="hidden items-stretch gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
          {sorted.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={currentPlanSlug === plan.slug}
              planAction={resolvePlanAction(plan.slug, currentPlanSlug, hasActiveSub)}
              onSubscribe={onSubscribe}
              subscribingSlug={subscribingSlug}
              compact
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
      {sorted.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={currentPlanSlug === plan.slug}
          planAction={resolvePlanAction(plan.slug, currentPlanSlug, hasActiveSub)}
          onSubscribe={onSubscribe}
          subscribingSlug={subscribingSlug}
          compact={false}
        />
      ))}
    </div>
  );
}
