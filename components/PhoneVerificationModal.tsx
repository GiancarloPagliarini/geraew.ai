'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Phone, Loader2, XCircle, CheckCircle, RefreshCw, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { usePhoneVerification } from '@/lib/phone-verification-context';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function maskPhone(phone: string) {
  if (phone.length < 6) return phone;
  const areaCode = phone.startsWith('55') ? phone.slice(2, 4) : phone.slice(0, 2);
  const lastFour = phone.slice(-4);
  return `(${areaCode}) *****-${lastFour}`;
}

export function PhoneVerificationModal() {
  const { user, accessToken, updateAuth } = useAuth();
  const { open, closeModal } = usePhoneVerification();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  // 3 steps: send-sms (has phone, needs to send), phone-input (no phone, Google users), code-input
  const [step, setStep] = useState<'send-sms' | 'phone-input' | 'code-input'>('send-sms');
  const [phoneInput, setPhoneInput] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'sending' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(true);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const phoneToVerify = user?.phone || (phoneInput ? `55${phoneInput}` : '');

  // Set initial step based on whether user has a phone
  useEffect(() => {
    if (user && !user.phoneVerified) {
      setStep(user.phone ? 'send-sms' : 'phone-input');
    }
  }, [user?.phone, user?.phoneVerified]);

  // Auto-dismiss success after 2.5s
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => setShowSuccess(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Don't show on login/auth pages, if not logged in, already verified, email not yet verified, or onboarding not done
  const isAuthPage = pathname === '/login' || pathname === '/verify-email' || pathname === '/forgot-password' || pathname === '/reset-password';
  if (!open || !user || !accessToken || user.phoneVerified || !user.emailVerified || !user.hasCompletedOnboarding || isAuthPage) return null;

  // Send SMS for user who already has phone from registration
  async function handleSendSmsExisting() {
    setStatus('sending');
    setErrorMessage('');
    try {
      await api.auth.sendPhoneVerification(`+${user!.phone}`);
      setStep('code-input');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao enviar SMS. Tente novamente.');
    }
  }

  // Send SMS for Google OAuth user who just typed their phone
  async function handleSendSmsNew() {
    if (!phoneInput || phoneInput.length < 10) return;
    setStatus('sending');
    setErrorMessage('');
    try {
      await api.auth.sendPhoneVerification(`+55${phoneInput}`);
      setStep('code-input');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Erro ao enviar SMS. Tente novamente.');
    }
  }

  async function handleResendSms() {
    setResendLoading(true);
    setResendSuccess('');
    try {
      const phone = user?.phone ? `+${user.phone}` : `+55${phoneInput}`;
      await api.auth.sendPhoneVerification(phone);
      setResendSuccess('SMS reenviado!');
    } catch (err) {
      setResendSuccess(err instanceof Error ? err.message : 'Erro ao reenviar.');
    } finally {
      setResendLoading(false);
    }
  }

  async function submitCode(code: string) {
    if (!accessToken) return;
    setStatus('verifying');
    setErrorMessage('');
    try {
      const phone = user?.phone ? `+${user.phone}` : `+55${phoneInput}`;
      const res = await api.auth.verifyPhone(accessToken, phone, code);
      updateAuth(res);
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      toast.success('Telefone verificado! Seus créditos gratuitos foram liberados.');
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'Codigo invalido ou expirado.');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current[0]?.focus(), 50);
    }
  }

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
      setDigits(newDigits);
      const focusIdx = Math.min(pasted.length, 5);
      inputsRef.current[focusIdx]?.focus();
      if (pasted.length === 6) submitCode(newDigits.join(''));
      return;
    }
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    const code = newDigits.join('');
    if (code.length === 6) submitCode(code);
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
    setDigits(newDigits);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) submitCode(newDigits.join(''));
  }

  if (status === 'success' && showSuccess) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1a2123] p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
              <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
            </div>
            <h2 className="text-xl font-bold text-white">Telefone verificado!</h2>
            <p className="text-sm text-white/50">
              Seus creditos gratuitos foram liberados. Bom uso!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    closeModal();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1a2123] p-8">
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/10">
            <Phone className="h-6 w-6 text-[#a2dd00]" />
          </div>
          <h2 className="text-xl font-bold text-white">Confirme seu celular</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Para liberar seus creditos gratuitos, confirme seu numero de celular via SMS.
          </p>
        </div>

        {/* Step: Send SMS (user already has phone from registration) */}
        {step === 'send-sms' && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-sm text-white/50">
              Vamos enviar um codigo SMS para{' '}
              <span className="text-white/70 font-medium">
                +55 {maskPhone(user.phone || '')}
              </span>
            </p>

            {status === 'error' && (
              <p className="w-full rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              onClick={handleSendSmsExisting}
              disabled={status === 'sending'}
              className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {status === 'sending' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enviar codigo SMS
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Phone input (for Google OAuth users without phone) */}
        {step === 'phone-input' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
                TELEFONE (WHATSAPP)
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/40 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+55</span>
                </div>
                <input
                  type="tel"
                  value={formatPhoneDisplay(phoneInput)}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setPhoneInput(d);
                  }}
                  placeholder="(11) 99999-8888"
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-[4.5rem] pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
                  autoFocus
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              onClick={handleSendSmsNew}
              disabled={phoneInput.length < 10 || status === 'sending'}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {status === 'sending' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Enviar codigo SMS
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step: Code input */}
        {step === 'code-input' && (
          <div className="flex flex-col items-center gap-5">
            <p className="text-sm text-white/50">
              Enviamos um SMS para{' '}
              <span className="text-white/70 font-medium">
                +55 {maskPhone(phoneToVerify)}
              </span>
            </p>

            <div className="flex gap-3">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={handleDigitPaste}
                  disabled={status === 'verifying'}
                  autoFocus={i === 0}
                  className={`h-14 w-12 rounded-xl border text-center text-xl font-bold outline-none transition-all ${
                    status === 'error'
                      ? 'border-red-400/40 bg-red-400/10 text-red-400'
                      : 'border-white/[0.08] bg-white/[0.04] text-white focus:border-[#a2dd00]/50 focus:bg-white/[0.06]'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {status === 'verifying' && (
              <div className="flex items-center gap-2 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando...</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {resendSuccess && (
              <p className="rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-3 py-2 text-xs text-[#a2dd00]">
                {resendSuccess}
              </p>
            )}

            <div className="flex flex-col items-center gap-2 pt-1">
              <button
                onClick={handleResendSms}
                disabled={resendLoading}
                className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                {resendLoading ? 'Reenviando...' : 'Reenviar SMS'}
              </button>

              {/* Allow Google users to go back and change phone */}
              {!user?.phone && (
                <button
                  onClick={() => { setStep('phone-input'); setDigits(['', '', '', '', '', '']); setStatus('idle'); setErrorMessage(''); setResendSuccess(''); }}
                  className="text-xs text-white/25 hover:text-white/50 transition-colors"
                >
                  Alterar numero
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
