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
    <div
      className="flex flex-col items-stretch gap-5 sm:grid sm:gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(activePackages.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {activePackages.map((pkg, i) => {
        const badge = getPackageBadge(i, activePackages.length);
        const isPopular = badge === 'popular';
        const isBest = badge === 'best';
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
            className={`relative flex flex-col rounded-2xl border p-4 transition-all sm:p-5 ${
              isBest
                ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
                : isPopular
                  ? 'border-[#f3f0ed]/20 bg-[#1f2a2d]'
                  : 'border-[#f3f0ed]/8 bg-[#1c2527]'
            }`}
          >
            {/* Badge */}
            {isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="flex items-center gap-1 rounded-full border border-[#f3f0ed]/20 bg-[#1a2123] px-3 py-1 text-[10px] font-bold tracking-widest text-[#f3f0ed]">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  MAIS POPULAR
                </span>
              </div>
            )}
            {isBest && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
                  <Flame className="h-2.5 w-2.5" />
                  MELHOR VALOR
                </span>
              </div>
            )}

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-0.5">
              <span className="text-sm font-bold text-[#f3f0ed]/60">R$</span>
              <span className="text-3xl font-bold tabular-nums text-[#f3f0ed]">
                {priceInt.toLocaleString('pt-BR')},{priceCents}
              </span>
            </div>

            {/* Credits */}
            <p className="mt-1 text-base font-bold text-[#f3f0ed]">
              {pkg.credits.toLocaleString('pt-BR')} créditos
            </p>

            {/* Savings */}
            {savingsPct > 0 && (
              <span className="mt-1.5 w-fit rounded-full bg-[#a2dd00]/15 px-2 py-0.5 text-[10px] font-bold text-[#a2dd00]">
                {savingsPct}% mais barato
              </span>
            )}

            {/* Divider */}
            <div className="my-4 h-px w-full bg-[#f3f0ed]/6" />

            {/* Perks */}
            <ul className="flex flex-1 flex-col gap-2.5">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
                  <Check
                    className={`mt-px h-3.5 w-3.5 shrink-0 ${isBest ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'}`}
                  />
                  {perk}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={!!purchasingId}
              className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                isBest
                  ? 'bg-[#a2dd00] text-[#1a2123] hover:brightness-110'
                  : isPopular
                    ? 'border border-[#f3f0ed]/20 bg-transparent text-[#f3f0ed] hover:bg-[#f3f0ed]/8'
                    : 'bg-[#f3f0ed]/8 text-[#f3f0ed] hover:bg-[#f3f0ed]/12'
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
        );
      })}
    </div>
  );
}
