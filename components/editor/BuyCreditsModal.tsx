'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Lock, X } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { CreditPackagesGrid } from './CreditPackagesGrid';

interface BuyCreditsModalProps {
  onClose: () => void;
}

export function BuyCreditsModal({ onClose }: BuyCreditsModalProps) {
  const { accessToken } = useAuth();

  const { data: packages, isLoading } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-6xl flex-col gap-4 overflow-y-auto sidebar-scroll rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] p-4 shadow-2xl sm:gap-6 sm:p-6">

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
        {!isLoading && packages && <CreditPackagesGrid packages={packages} />}

        {/* Footer */}
        <p className="text-center text-xs text-[#f3f0ed]/20">
          Pagamento único · Sem assinatura · Créditos acumulam com os do plano
        </p>
      </div>
    </div>
  );
}
