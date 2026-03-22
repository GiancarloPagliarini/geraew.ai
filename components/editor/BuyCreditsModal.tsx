'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Flame,
  Lock,
  Loader2,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CreditPackage } from '@/lib/api';

// ─── helpers (mirrored from app/creditos/page.tsx) ────────────────────────────

function getPerks(pkg: CreditPackage, isBest: boolean): string[] {
  const images = Math.floor(pkg.credits / 9);
  const videos = Math.floor(pkg.credits / 15);

  const perks = [
    `Até ${images} imagens em alta qualidade`,
    `Até ${videos} vídeos com áudio`,
    'Combinação livre entre mídias',
  ];

  if (pkg.credits >= 1600) perks[2] = 'Equilíbrio entre imagens e vídeos';
  if (pkg.credits >= 3500) perks[2] = 'Produção intensa sem se preocupar';
  if (isBest) perks.push('Volume máximo para produção profissional');

  return perks;
}

function getBadge(i: number, total: number): 'popular' | 'best' | null {
  if (total <= 1) return null;
  if (total === 2) return i === 1 ? 'best' : null;
  if (i === Math.floor(total / 2)) return 'popular';
  if (i === total - 1) return 'best';
  return null;
}

// ─── component ────────────────────────────────────────────────────────────────

interface BuyCreditsModalProps {
  onClose: () => void;
}

export function BuyCreditsModal({ onClose }: BuyCreditsModalProps) {
  const { accessToken } = useAuth();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activePackages = (packages ?? [])
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

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-y-auto rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-4 shadow-2xl sm:gap-6 sm:overflow-visible sm:p-6">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-[#f3f0ed] sm:text-xl">
            Escolha seu pacote de créditos
          </h2>
          <span className="rounded-full border border-[#f3f0ed]/10 px-4 py-1 text-[11px] text-[#f3f0ed]/50">
            Créditos extras nunca expiram
          </span>
          <div className="flex items-center gap-1.5 text-[11px] text-[#f3f0ed]/30">
            <Lock className="h-3 w-3" />
            Pagamento seguro via Pix ou Cartão
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {/* Cards */}
        {!isLoading && activePackages.length > 0 && (
          <div className="flex flex-col items-stretch gap-5 sm:grid sm:gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(activePackages.length, 4)}, minmax(0, 1fr))` }}>

            {activePackages.map((pkg, i) => {
              const badge = getBadge(i, activePackages.length);
              const isPopular = badge === 'popular';
              const isBest = badge === 'best';
              const pricePerCredit = pkg.priceCents / pkg.credits;
              const savingsPct =
                basePricePerCredit > 0
                  ? Math.round((1 - pricePerCredit / basePricePerCredit) * 100)
                  : 0;
              const perks = getPerks(pkg, isBest);
              const priceInt = Math.floor(pkg.priceCents / 100);
              const priceCents = String(pkg.priceCents % 100).padStart(2, '0');
              const isPurchasing = purchasingId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl border p-4 transition-all sm:p-5 ${isBest
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

                  {/* Price per credit */}
                  <p className="mt-4 text-[11px] text-[#f3f0ed]/20">
                    R$ {(pricePerCredit / 100).toFixed(4).replace('.', ',')} por crédito
                  </p>

                  {/* CTA */}
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={!!purchasingId}
                    className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${isBest
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
        )}

        {/* Footer */}
        <p className="text-center text-xs text-[#f3f0ed]/20">
          Pagamento único · Sem assinatura · Créditos acumulam com os do plano
        </p>
      </div>
    </div>
  );
}
