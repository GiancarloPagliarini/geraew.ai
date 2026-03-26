'use client';

import { CheckCircle, XCircle, Loader2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'input' | 'loading' | 'success' | 'error'>('input');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];

    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      const focusIdx = Math.min(pasted.length, 5);
      inputsRef.current[focusIdx]?.focus();

      if (pasted.length === 6) {
        submitCode(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === 6) {
      submitCode(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const focusIdx = Math.min(pasted.length, 5);
    inputsRef.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      submitCode(newDigits.join(''));
    }
  }

  async function submitCode(code: string) {
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.auth.verifyEmail(code);
      setStatus('success');
      setMessage(res.message);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Código inválido ou expirado.');
    }
  }

  function handleRetry() {
    setDigits(['', '', '', '', '', '']);
    setStatus('input');
    setMessage('');
    setResendSuccess('');
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
  }

  async function handleResend() {
    if (!emailParam) return;
    setResendLoading(true);
    setResendSuccess('');
    try {
      const res = await api.auth.resendVerificationByEmail(emailParam);
      setResendSuccess(res.message || 'Código reenviado!');
    } catch (err) {
      setResendSuccess(err instanceof Error ? err.message : 'Erro ao reenviar.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a2123] px-4">
      <div className="flex w-full max-w-[400px] flex-col items-center gap-6">
        {/* Logo */}
        <Image
          src="/full_logo.svg"
          alt="Geraew AI"
          width={140}
          height={140}
          className="mix-blend-lighten"
        />

        {status === 'success' ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
              <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#f3f0ed]">Email verificado!</h1>
              <p className="mt-2 text-sm text-[#f3f0ed]/50">{message}</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Ir para o login
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[#f3f0ed]">Verifique seu email</h1>
              <p className="mt-2 text-sm text-[#f3f0ed]/50">
                {emailParam
                  ? <>Enviamos um código de 6 dígitos para <span className="text-[#f3f0ed]/70">{emailParam}</span></>
                  : 'Digite o código de 6 dígitos enviado para seu email'
                }
              </p>
            </div>

            {/* Code input */}
            <div className="flex gap-3">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  disabled={status === 'loading'}
                  className={`h-14 w-12 rounded-xl border text-center text-xl font-bold outline-none transition-all ${
                    status === 'error'
                      ? 'border-red-400/40 bg-red-400/10 text-red-400'
                      : 'border-white/[0.08] bg-white/[0.04] text-white focus:border-[#a2dd00]/50 focus:bg-white/[0.06]'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {status === 'loading' && (
              <div className="flex items-center gap-2 text-[#f3f0ed]/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verificando...</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{message}</span>
                </div>
                <button
                  onClick={handleRetry}
                  className="text-xs text-[#a2dd00]/70 hover:text-[#a2dd00] transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {resendSuccess && (
              <p className="rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-3 py-2 text-xs text-[#a2dd00]">
                {resendSuccess}
              </p>
            )}

            {/* Resend + Back */}
            <div className="flex flex-col items-center gap-3 pt-2">
              {emailParam && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Reenviando...' : 'Reenviar código'}
                </button>
              )}
              <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar para o login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
