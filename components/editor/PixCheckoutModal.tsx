'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api, type CreditPackage, type PixCharge } from '@/lib/api';
import { formatCurrency } from '@/lib/plans';

interface PixCheckoutModalProps {
  pkg: CreditPackage;
  onClose: () => void;
}

export function PixCheckoutModal({ pkg, onClose }: PixCheckoutModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [pix, setPix] = useState<PixCharge | null>(null);
  const [creating, setCreating] = useState(true);
  const [paid, setPaid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const charge = await api.payments.createBoostPix(accessToken, pkg.id);
        if (!cancelled) setPix(charge);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao gerar PIX');
      } finally {
        if (!cancelled) setCreating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, pkg.id]);

  // Countdown
  useEffect(() => {
    if (!pix) return;
    const expiresAt = new Date(pix.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) stoppedRef.current = true;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pix]);

  // Polling
  useEffect(() => {
    if (!pix || !accessToken || paid) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await api.payments.getPixStatus(accessToken, pix.abacatepayId);
        if (res.paid) {
          setPaid(true);
          stoppedRef.current = true;
          queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
          queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
          toast.success('Pagamento confirmado! Créditos liberados.');
          return;
        }
      } catch {
        // segue tentando — falha transiente
      }
      timeoutId = setTimeout(poll, 3000);
    };
    timeoutId = setTimeout(poll, 3000);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pix, accessToken, paid, queryClient]);

  // Auto-close 2s após pagamento
  useEffect(() => {
    if (!paid) return;
    const id = setTimeout(onClose, 2000);
    return () => clearTimeout(id);
  }, [paid, onClose]);

  async function handleCopy() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar — copie manualmente.');
    }
  }

  const expired = secondsLeft === 0;
  const minutes = secondsLeft != null ? Math.floor(secondsLeft / 60) : 0;
  const seconds = secondsLeft != null ? secondsLeft % 60 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-md flex-col gap-5 rounded-2xl border border-[#f3f0ed]/10 bg-[#1c2527] p-6 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a2dd00]">
            Pagamento via PIX
          </span>
          <h3 className="text-lg font-bold text-[#f3f0ed]">{pkg.name}</h3>
          <p className="text-sm text-[#f3f0ed]/50">
            {pkg.credits.toLocaleString('pt-BR')} créditos · {formatCurrency(pkg.priceCents, 'BRL', 'pt-BR')}
          </p>
        </div>

        {/* Body */}
        {creating && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
            <p className="text-xs text-[#f3f0ed]/50">Gerando QR Code…</p>
          </div>
        )}

        {error && !creating && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-300">
            <span className="font-semibold">Falha ao gerar PIX</span>
            <span className="text-xs text-red-300/70">{error}</span>
          </div>
        )}

        {pix && !error && (
          <>
            {paid ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/15">
                  <Check className="h-7 w-7 text-[#a2dd00]" />
                </div>
                <p className="text-base font-bold text-[#f3f0ed]">Pagamento confirmado</p>
                <p className="text-xs text-[#f3f0ed]/50">Créditos liberados na sua conta.</p>
              </div>
            ) : (
              <>
                {/* QR */}
                <div className="flex justify-center">
                  <div className="rounded-xl bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pix.brCodeBase64}
                      alt="QR Code PIX"
                      className="h-48 w-48"
                    />
                  </div>
                </div>

                {/* Timer / status */}
                <div className="flex items-center justify-center gap-2 text-xs">
                  {expired ? (
                    <span className="font-semibold text-red-400">PIX expirado</span>
                  ) : (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]" />
                      <span className="text-[#f3f0ed]/50">Aguardando pagamento</span>
                      {secondsLeft != null && (
                        <span className="font-mono tabular-nums text-[#f3f0ed]/40">
                          ({minutes}:{seconds.toString().padStart(2, '0')})
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Copia-e-cola */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">
                    PIX copia-e-cola
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-2.5">
                    <code className="flex-1 truncate text-[11px] text-[#f3f0ed]/70">
                      {pix.brCode}
                    </code>
                    <button
                      onClick={handleCopy}
                      disabled={expired}
                      className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-[#a2dd00] px-3 text-[11px] font-bold text-[#141a1c] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-center text-[11px] text-[#f3f0ed]/30">
                  Abra seu app do banco, escolha PIX → copia-e-cola e cole o código.
                  {pix.devMode && ' (modo sandbox — pagamento simulado)'}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
