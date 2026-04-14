'use client';

import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const t = useTranslations('auth.resetPassword');
  const tCommon = useTranslations('auth.common');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError(t('passwordWeak'));
      return;
    }

    if (!token) {
      setError(t('tokenMissing'));
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a2123] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-400/15">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">{t('invalidLinkTitle')}</h1>
          <p className="max-w-md text-sm text-[#f3f0ed]/50">
            {t('invalidLinkBody')}
          </p>
        </div>
        <button
          onClick={() => router.push('/forgot-password')}
          className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {t('requestNewLink')}
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a2123] px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
            <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">{t('successTitle')}</h1>
          <p className="max-w-md text-sm text-[#f3f0ed]/50">
            {t('successBody')}
          </p>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {t('goToLogin')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a2123] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/full_logo.svg"
            alt="Geraew AI"
            width={140}
            height={140}
            className="mix-blend-lighten"
          />
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mb-5 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tCommon('backToLogin')}
        </button>

        <h1 className="mb-2 text-lg font-bold text-white">{t('title')}</h1>
        <p className="mb-6 text-xs text-white/40">
          {t('description')}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
              {tCommon('labels.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
              {tCommon('labels.confirmPassword')}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
            />
          </div>

          <p className="text-[10px] text-white/25">
            {t('passwordHelper')}
          </p>

          {error && (
            <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('submit')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
