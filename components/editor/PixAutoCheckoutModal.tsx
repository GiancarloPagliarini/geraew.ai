'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Loader2, X, Smartphone } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api, type PixAutoAuthorization } from '@/lib/api';
import { formatCurrency } from '@/lib/plans';
import {
  formatTaxIdMask,
  getTaxIdKind,
  isValidTaxId,
  sanitizeTaxId,
} from '@/lib/tax-id';
import { PixIcon } from '@/components/icons/PixIcon';

interface PixAutoCheckoutModalProps {
  planSlug: string;
  planName: string;
  priceCents: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PixAutoCheckoutModal({
  planSlug,
  planName,
  priceCents,
  onClose,
  onSuccess,
}: PixAutoCheckoutModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });
  const taxIdMasked = profile?.taxIdMasked ?? null;
  const hasTaxIdOnFile = !!taxIdMasked;

  const [taxIdInput, setTaxIdInput] = useState('');
  const [step, setStep] = useState<'loading' | 'confirm' | 'input' | 'qr'>('loading');

  const [auth, setAuth] = useState<PixAutoAuthorization | null>(null);
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stoppedRef = useRef(false);

  // Step inicial assim que o profile chega
  useEffect(() => {
    if (step !== 'loading' || !profile) return;
    setStep(hasTaxIdOnFile ? 'confirm' : 'input');
  }, [profile, hasTaxIdOnFile, step]);

  const taxIdDigits = sanitizeTaxId(taxIdInput);
  const taxIdKind = getTaxIdKind(taxIdDigits);
  const taxIdValid = isValidTaxId(taxIdDigits);
  const taxIdComplete = taxIdDigits.length === 11 || taxIdDigits.length === 14;
  const showTaxIdError = taxIdComplete && !taxIdValid;

  const createAuthorization = useCallback(
    async (taxIdToSend?: string) => {
      if (!accessToken || creating) return;
      setCreating(true);
      setError(null);
      try {
        const a = await api.subscriptions.createPixAuto(accessToken, planSlug, taxIdToSend);
        setAuth(a);
        setStep('qr');
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Não foi possível gerar o PIX. Tente novamente em instantes.';
        setError(message);
      } finally {
        setCreating(false);
      }
    },
    [accessToken, creating, planSlug, queryClient],
  );

  function handleSubmitTaxId(e: React.FormEvent) {
    e.preventDefault();
    if (!taxIdValid) return;
    createAuthorization(taxIdDigits);
  }

  // Polling do status da autorização
  useEffect(() => {
    if (!auth || !accessToken || active) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await api.subscriptions.pixAutoStatus(accessToken, auth.authorizationId);
        if (res.subscriptionActive || res.status === 'ACTIVE') {
          setActive(true);
          stoppedRef.current = true;
          queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
          queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
          toast.success('Assinatura ativada! Bem-vindo ao plano.');
          onSuccess?.();
          return;
        }
      } catch {
        // segue tentando
      }
      timeoutId = setTimeout(poll, 3000);
    };
    timeoutId = setTimeout(poll, 3000);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [auth, accessToken, active, queryClient, onSuccess]);

  // Auto-fecha 2s após ativação
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [active, onClose]);

  async function handleCopy() {
    if (!auth?.qrCodePayload) return;
    try {
      await navigator.clipboard.writeText(auth.qrCodePayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar — copie manualmente.');
    }
  }

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
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <PixIcon className="h-3 w-3 text-[#32BCAD]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#32BCAD]">
              {auth?.isUpgrade ? 'Upgrade via PIX Automático' : 'Assinatura via PIX Automático'}
            </span>
          </div>
          <h3 className="text-lg font-bold text-[#f3f0ed]">{planName}</h3>
          <p className="text-sm text-[#f3f0ed]/50">
            {formatCurrency(priceCents, 'BRL', 'pt-BR')} por mês · cobrado automaticamente
          </p>
        </div>

        {/* Resumo do upgrade (só quando aplicável) */}
        {auth?.isUpgrade && step === 'qr' && !active && (
          <div className="flex flex-col gap-2 rounded-xl border border-[#32BCAD]/20 bg-[#32BCAD]/[0.06] p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#32BCAD]/80">
                Pagando agora
              </span>
              <span className="text-base font-bold tabular-nums text-[#7BE8DC]">
                {formatCurrency(auth.immediateValueCents, 'BRL', 'pt-BR')}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-[#32BCAD]/15 pt-2">
              <span className="text-[11px] text-[#f3f0ed]/50">
                Próximas mensalidades
              </span>
              <span className="text-xs font-semibold tabular-nums text-[#f3f0ed]/80">
                {formatCurrency(auth.recurringValueCents, 'BRL', 'pt-BR')}/mês
              </span>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {/* Step: confirma CPF salvo */}
        {step === 'confirm' && taxIdMasked && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-[#a2dd00]/15 bg-[#a2dd00]/[0.04] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/45">
                  Documento do pagador
                </span>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-[11px] font-semibold text-[#a2dd00]/70 transition-colors hover:text-[#a2dd00] hover:underline"
                >
                  Usar outro
                </button>
              </div>
              <div className="flex items-center gap-2 font-mono text-base font-semibold tabular-nums text-[#f3f0ed]">
                <Check className="h-4 w-4 text-[#a2dd00]" />
                {taxIdMasked}
              </div>
            </div>

            <div className="rounded-lg border border-[#32BCAD]/15 bg-[#32BCAD]/[0.04] p-3 text-[11px] leading-relaxed text-[#f3f0ed]/65">
              No próximo passo seu banco vai perguntar se autoriza a cobrança mensal.
              Após aprovar, sua assinatura é ativada na hora.
            </div>

            {error && (
              <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => createAuthorization()}
              disabled={creating}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] text-sm font-bold text-[#141a1c] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando QR Code…
                </>
              ) : (
                'Gerar QR Code de autorização'
              )}
            </button>
          </div>
        )}

        {/* Step: input de CPF */}
        {step === 'input' && (
          <form className="flex flex-col gap-4" onSubmit={handleSubmitTaxId}>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/50">
                <span>CPF ou CNPJ do pagador</span>
                {taxIdKind && taxIdValid && (
                  <span className="flex items-center gap-1 text-[#a2dd00]">
                    <Check className="h-3 w-3" />
                    {taxIdKind.toUpperCase()} válido
                  </span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="000.000.000-00"
                value={formatTaxIdMask(taxIdDigits)}
                onChange={(e) => setTaxIdInput(e.target.value)}
                maxLength={18}
                aria-invalid={showTaxIdError || undefined}
                className={`h-11 rounded-lg border bg-[#f3f0ed]/3 px-3 text-sm text-[#f3f0ed] outline-none transition-colors placeholder:text-[#f3f0ed]/25 ${
                  showTaxIdError
                    ? 'border-red-500/40 focus:border-red-500/60'
                    : taxIdValid
                      ? 'border-[#a2dd00]/30 focus:border-[#a2dd00]/50'
                      : 'border-[#f3f0ed]/10 focus:border-[#a2dd00]/40'
                }`}
              />
              {showTaxIdError ? (
                <p className="flex items-center gap-1.5 text-[11px] text-red-300/80">
                  <AlertCircle className="h-3 w-3" />
                  {taxIdDigits.length === 11
                    ? 'CPF inválido. Confira os dígitos.'
                    : 'CNPJ inválido. Confira os dígitos.'}
                </p>
              ) : (
                <p className="text-[11px] text-[#f3f0ed]/35">
                  Exigido pelo banco para autorizar a cobrança recorrente.
                </p>
              )}
            </div>

            {error && (
              <div className="flex gap-2 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!taxIdValid || creating}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] text-sm font-bold text-[#141a1c] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando QR Code…
                </>
              ) : (
                'Gerar QR Code de autorização'
              )}
            </button>
          </form>
        )}

        {/* Step: QR Code */}
        {step === 'qr' && auth && (
          <>
            {active ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/15">
                  <Check className="h-7 w-7 text-[#a2dd00]" />
                </div>
                <p className="text-base font-bold text-[#f3f0ed]">Assinatura ativada</p>
                <p className="text-center text-xs text-[#f3f0ed]/50">
                  Bem-vindo ao {planName}. Os créditos já estão na sua conta.
                </p>
              </div>
            ) : (
              <>
                {/* QR */}
                {auth.qrCodeEncodedImage ? (
                  <div className="flex justify-center">
                    <div className="rounded-xl bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={auth.qrCodeEncodedImage}
                        alt="QR Code PIX Automático"
                        className="h-48 w-48"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-xs text-[#f3f0ed]/40">
                    QR Code indisponível — use o código copia e cola
                  </div>
                )}

                {/* Status */}
                <div className="flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin text-[#32BCAD]" />
                  <span className="text-[#f3f0ed]/50">Aguardando autorização no seu banco</span>
                </div>

                {/* Copia-e-cola */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">
                    PIX copia-e-cola
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 p-2.5">
                    <code className="flex-1 truncate text-[11px] text-[#f3f0ed]/70">
                      {auth.qrCodePayload || '—'}
                    </code>
                    <button
                      onClick={handleCopy}
                      disabled={!auth.qrCodePayload}
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

                {/* Instrução */}
                <div className="flex gap-2 rounded-lg border border-[#32BCAD]/15 bg-[#32BCAD]/[0.04] p-3 text-[11px] leading-relaxed text-[#f3f0ed]/65">
                  <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#32BCAD]" />
                  <span>
                    Abra o app do seu banco, escolha PIX → copia-e-cola → cole o código. Seu banco
                    vai perguntar se autoriza a cobrança mensal — basta aprovar.
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
