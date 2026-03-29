'use client';

import {
  ArrowRight,
  Check,
  Flame,
  Loader2,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CreditPackage } from '@/lib/api';
import { getPackagePerks, getPackageBadge } from '@/lib/plans';

interface CreditPackagesGridProps {
  packages: CreditPackage[];
}

export function CreditPackagesGrid({ packages }: CreditPackagesGridProps) {
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

  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4">
      {activePackages.map((pkg, i) => {
        const badge = getPackageBadge(i, activePackages.length);
        const isPopular = badge === 'popular';
        const isBest = badge === 'best';
        const isHighlighted = isPopular || isBest;
        const pricePerCredit = pkg.priceCents / pkg.credits;
        const savingsPct =
          basePricePerCredit > 0
            ? Math.round((1 - pricePerCredit / basePricePerCredit) * 100)
            : 0;
        const perks = getPackagePerks(pkg);
        const priceInt = Math.floor(pkg.priceCents / 100);
        const priceCents = String(pkg.priceCents % 100).padStart(2, '0');
        const isPurchasing = purchasingId === pkg.id;

        return (
          <div
            key={pkg.id}
            className={`group relative flex flex-col rounded-[20px] border transition-all duration-300 ${
              isBest
                ? 'border-[#a2dd00]/30 bg-[#1a2523]'
                : isPopular
                  ? 'border-[#f3f0ed]/[0.1] bg-[#171e20]'
                  : 'border-[#f3f0ed]/[0.06] bg-[#171e20] hover:border-[#f3f0ed]/[0.1]'
            }`}
          >
            {/* Top glow for best value */}
            {isBest && (
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
            {isPopular && (
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <div className="flex items-center gap-1.5 rounded-full border border-[#f3f0ed]/15 bg-[#1a2123] px-4 py-1 shadow-lg">
                  <Star className="h-3 w-3 fill-[#f3f0ed]/60 text-[#f3f0ed]/60" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#f3f0ed]">
                    Mais Popular
                  </span>
                </div>
              </div>
            )}
            {isBest && (
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <div className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] px-4 py-1 shadow-[0_0_20px_rgba(162,221,0,0.3)]">
                  <Flame className="h-3 w-3 text-[#141a1c]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#141a1c]">
                    Melhor Valor
                  </span>
                </div>
              </div>
            )}

            {/* Card inner */}
            <div className="relative flex flex-1 flex-col p-5 sm:p-6">
              {/* Credits — hero number */}
              <div className="mt-1">
                <span
                  className={`text-[36px] font-extrabold leading-none tracking-tight tabular-nums ${
                    isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'
                  }`}
                >
                  {pkg.credits.toLocaleString('pt-BR')}
                </span>
                <p className="mt-1 text-[12px] text-[#f3f0ed]/30">créditos</p>
              </div>

              {/* Price */}
              <div className="mt-3 flex items-baseline gap-0.5">
                <span className="text-[11px] font-bold text-[#f3f0ed]/50">R$</span>
                <span className={`text-[20px] font-bold tabular-nums ${isBest ? 'text-[#f3f0ed]' : 'text-[#f3f0ed]/70'}`}>
                  {priceInt.toLocaleString('pt-BR')},{priceCents}
                </span>
              </div>

              {/* Savings badge */}
              {savingsPct > 0 && (
                <span className="mt-2 w-fit rounded-full bg-[#a2dd00]/12 px-2.5 py-0.5 text-[10px] font-bold text-[#a2dd00]">
                  {savingsPct}% mais barato
                </span>
              )}

              {/* Divider */}
              <div className="my-5 h-px w-full bg-[#f3f0ed]/[0.05]" />

              {/* Perks */}
              <ul className="flex flex-1 flex-col gap-2.5">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5">
                    <div
                      className={`mt-[2px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full ${
                        isBest ? 'bg-[#a2dd00]/15' : 'bg-[#f3f0ed]/[0.06]'
                      }`}
                    >
                      <Check className={`h-2.5 w-2.5 ${isBest ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/45'}`} />
                    </div>
                    <span className="text-[12px] leading-snug text-[#f3f0ed]/55">{perk}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={!!purchasingId}
                className={`mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  isBest
                    ? 'bg-[#a2dd00] text-[#141a1c] shadow-[0_0_0_1px_rgba(162,221,0,0.3)] hover:shadow-[0_0_28px_rgba(162,221,0,0.25)] hover:brightness-110'
                    : isPopular
                      ? 'border border-[#f3f0ed]/[0.12] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.2] hover:bg-[#f3f0ed]/[0.03] hover:text-[#f3f0ed]'
                      : 'bg-[#f3f0ed]/[0.06] text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/[0.1] hover:text-[#f3f0ed]'
                }`}
              >
                {isPurchasing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Comprar
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
