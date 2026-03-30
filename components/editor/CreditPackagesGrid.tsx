'use client';

import {
  ArrowRight,
  Check,
  Coins,
  Flame,
  Loader2,
  Zap,
  Crown,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CreditPackage } from '@/lib/api';
import { getPackageBadge, getBoostMeta } from '@/lib/plans';

interface CreditPackagesGridProps {
  packages: CreditPackage[];
  compact?: boolean;
}

export function CreditPackagesGrid({ packages, compact }: CreditPackagesGridProps) {
  const { accessToken } = useAuth();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const activePackages = packages
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const basePricePerCredit =
    activePackages.length > 0
      ? Math.max(...activePackages.map((p) => p.priceCents / p.credits))
      : 0;

  async function handlePurchase(packageId: string) {
    if (!accessToken || purchasingId) return;
    setPurchasingId(packageId);
    try {
      const { checkoutUrl } = await api.credits.purchase(accessToken, packageId);
      window.location.href = checkoutUrl;
    } catch {
      setPurchasingId(null);
    }
  }

  if (activePackages.length === 0) return null;

  // Fake "original" prices — 40% higher for anchor effect
  function getOriginalPrice(priceCents: number) {
    return Math.round(priceCents * 1.4 / 100) * 100;
  }

  function getDiscountPct(priceCents: number) {
    const original = getOriginalPrice(priceCents);
    return Math.round((1 - priceCents / original) * 100);
  }

  return (
    <div className={`grid grid-cols-1 items-stretch sm:grid-cols-2 lg:grid-cols-3 ${compact ? 'gap-3' : 'gap-4 xl:gap-5'}`}>
      {activePackages.map((pkg, i) => {
        const badge = getPackageBadge(i, activePackages.length);
        const isPopular = badge === 'popular';
        const isBest = badge === 'best';
        const meta = getBoostMeta(pkg);
        const pricePerCredit = pkg.priceCents / pkg.credits;
        const savingsPct =
          basePricePerCredit > 0
            ? Math.round((1 - pricePerCredit / basePricePerCredit) * 100)
            : 0;
        const priceInt = Math.floor(pkg.priceCents / 100);
        const priceCents = String(pkg.priceCents % 100).padStart(2, '0');
        const isPurchasing = purchasingId === pkg.id;
        const originalPrice = getOriginalPrice(pkg.priceCents);
        const discountPct = getDiscountPct(pkg.priceCents);

        const PkgIcon = isBest ? Crown : isPopular ? Flame : Zap;

        return (
          <div
            key={pkg.id}
            className={`group relative flex flex-col border transition-all duration-300 ${compact ? 'rounded-[16px]' : 'rounded-[22px]'} ${
              isBest
                ? 'border-[#a2dd00]/30 bg-gradient-to-b from-[#1f2d20] to-[#1a2523] ring-1 ring-[#a2dd00]/15 shadow-[0_0_40px_rgba(162,221,0,0.08)] hover:shadow-[0_0_60px_rgba(162,221,0,0.12)]'
                : isPopular
                  ? 'border-[#f3f0ed]/[0.1] bg-[#171e20] hover:border-[#f3f0ed]/[0.15]'
                  : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.12] hover:bg-[#1a1f21]'
            }`}
          >
            {/* Top glow for best value */}
            {isBest && (
              <>
                <div
                  className={`pointer-events-none absolute -inset-px ${compact ? 'rounded-[16px]' : 'rounded-[22px]'}`}
                  style={{
                    background: 'linear-gradient(180deg, rgba(162,221,0,0.15) 0%, rgba(162,221,0,0) 50%)',
                  }}
                />
                <div
                  className={`pointer-events-none absolute -top-[1px] h-[2px] ${compact ? 'left-6 right-6' : 'left-8 right-8'}`}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(162,221,0,0.6), transparent)',
                  }}
                />
              </>
            )}

            {/* Badge */}
            {isPopular && (
              <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${compact ? '-top-2.5' : '-top-3'}`}>
                <div className={`flex items-center gap-1 rounded-full border border-[#f3f0ed]/15 bg-[#1a2123] shadow-lg ${compact ? 'px-3 py-0.5' : 'px-4 py-1'}`}>
                  <Flame className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-[#f3f0ed]/60`} />
                  <span className={`font-bold uppercase tracking-[0.08em] text-[#f3f0ed] ${compact ? 'text-[10px]' : 'text-[10px]'}`}>
                    Mais Popular
                  </span>
                </div>
              </div>
            )}
            {isBest && (
              <div className={`absolute left-1/2 z-10 -translate-x-1/2 ${compact ? '-top-2.5' : '-top-3.5'}`}>
                <div className={`flex items-center gap-1 rounded-full bg-[#a2dd00] shadow-[0_0_30px_rgba(162,221,0,0.4)] ${compact ? 'px-3 py-0.5' : 'px-5 py-1.5'}`}>
                  <Crown className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} text-[#141a1c]`} />
                  <span className={`font-extrabold uppercase tracking-[0.08em] text-[#141a1c] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                    Melhor Valor
                  </span>
                </div>
              </div>
            )}

            {/* Card inner */}
            <div className={`relative flex flex-1 flex-col ${compact ? 'p-3' : 'p-5 sm:p-6'}`}>

              {/* Icon + label */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center rounded-lg ${compact ? 'h-6 w-6' : 'h-8 w-8'} ${
                  isBest ? 'bg-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.05]'
                }`}>
                  <PkgIcon className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
                </div>
                <div>
                  <h3 className={`font-bold text-[#f3f0ed] ${compact ? 'text-[15px]' : 'text-[15px]'}`}>{meta.label}</h3>
                  {meta.description && (
                    <span className={`text-[#f3f0ed]/30 ${compact ? 'text-[11px]' : 'text-[10px]'}`}>{meta.description}</span>
                  )}
                </div>
              </div>

              {/* Price with anchor */}
              <div className={compact ? 'mt-3' : 'mt-5 min-h-[55px]'}>
                {discountPct > 0 && (
                  <div className={`flex items-center gap-1.5 ${compact ? 'mb-0.5' : 'mb-1'}`}>
                    <span className={`text-[#f3f0ed]/25 line-through ${compact ? 'text-[12px]' : 'text-[12px]'}`}>
                      R$ {(originalPrice / 100).toLocaleString('pt-BR')},{String(originalPrice % 100).padStart(2, '0')}
                    </span>
                    <span className={`rounded-md bg-[#a2dd00]/15 font-bold text-[#a2dd00] ${compact ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[9px]'}`}>
                      {discountPct}% OFF
                    </span>
                  </div>
                )}
                <div className="flex items-baseline gap-0.5">
                  <span className={`font-extrabold leading-none tracking-tight ${compact ? 'text-[22px]' : 'text-[22px]'} ${
                    isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
                  }`}>
                    R$ {priceInt.toLocaleString('pt-BR')},{priceCents}
                  </span>
                </div>
              </div>

              {/* Credits highlight box */}
              <div className={`flex items-center gap-1.5 rounded-lg border ${compact ? 'mt-2 px-2.5 py-1.5' : 'mt-4 rounded-xl px-3.5 py-2.5'} ${
                isBest ? 'bg-[#a2dd00]/10 border-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.03] border-[#f3f0ed]/[0.05]'
              }`}>
                <Coins className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} ${isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
                <div>
                  <span className={`font-extrabold tabular-nums ${compact ? 'text-[15px]' : 'text-[16px]'} ${
                    isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
                  }`}>
                    {pkg.credits.toLocaleString('pt-BR')}
                  </span>
                  <span className={`ml-1 text-[#f3f0ed]/30 ${compact ? 'text-[12px]' : 'text-[11px]'}`}>créditos</span>
                </div>
              </div>

              {/* Savings callout */}
              {savingsPct > 0 && (
                <p className={`font-medium text-[#a2dd00]/70 ${compact ? 'mt-1.5 text-[12px]' : 'mt-3 text-[11px]'}`}>
                  Economize {savingsPct}% por crédito
                </p>
              )}

              {/* Divider */}
              <div className={`h-px w-full bg-[#f3f0ed]/[0.06] ${compact ? 'my-2.5' : 'my-4'}`} />

              {/* Perks */}
              <ul className={`flex flex-col ${compact ? 'min-h-[55px] gap-1.5' : 'min-h-[80px] gap-2.5'}`}>
                {[
                  'Créditos entram na hora',
                  'Nunca expiram',
                  'Acumulam com os do plano',
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <div
                      className={`mt-[1px] flex shrink-0 items-center justify-center rounded-full ${compact ? 'h-[13px] w-[13px]' : 'h-[16px] w-[16px] mt-[2px]'} ${
                        isBest ? 'bg-[#a2dd00]/20' : 'bg-[#f3f0ed]/[0.06]'
                      }`}
                    >
                      <Check className={`${compact ? 'h-2 w-2' : 'h-2.5 w-2.5'} ${isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/45'}`} />
                    </div>
                    <span className={`leading-snug text-[#f3f0ed]/55 ${compact ? 'text-[12px]' : 'text-[12px]'}`}>{perk}</span>
                  </li>
                ))}
              </ul>

              <div className="flex-1" />

              {/* CTA */}
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={!!purchasingId}
                className={`flex w-full items-center justify-center gap-2 rounded-xl font-bold transition-all duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'mt-3 h-9 text-[13px]' : 'mt-6 h-11 text-[13px]'} ${
                  isBest
                    ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_4px_20px_rgba(162,221,0,0.3)] hover:shadow-[0_4px_30px_rgba(162,221,0,0.4)] hover:brightness-110'
                    : isPopular
                      ? 'border border-[#f3f0ed]/[0.1] bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/80 hover:border-[#f3f0ed]/[0.2] hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]'
                      : 'border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]'
                }`}
              >
                {isPurchasing ? (
                  <Loader2 className={`animate-spin ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
                ) : (
                  <>
                    Comprar agora
                    <ArrowRight className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                  </>
                )}
              </button>

              {/* Trust micro-copy */}
              {!compact && (
                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-[#f3f0ed]/20">
                  <Shield className="h-3 w-3" />
                  Pagamento único · Sem assinatura
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
