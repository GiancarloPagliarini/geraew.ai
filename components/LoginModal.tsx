'use client';

import { Eye, EyeOff, Mail, ArrowLeft, UserPlus, LogIn, CheckCircle, XCircle, Loader2, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useLoginModal } from '@/lib/login-modal-context';

const slides = [
  {
    id: 0,
    slideKey: 's0' as const,
    bg: 'bg-black',
    accent: '#a2dd00',
    video: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/generations/cmmwn2wq5007vus01furnxyh4/22c243fd-ce57-4c3e-aa8a-afadc811da46/output_0.mp4',
  },
  {
    id: 1,
    slideKey: 's1' as const,
    bg: 'bg-black',
    accent: '#ff6b9d',
    video: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/generations/cmmxjmvws00fyus01sxwu628l/5727b0ea-86d6-4887-8707-57eeb1db17bf/output_2.mp4',
  },
  {
    id: 2,
    slideKey: 's2' as const,
    bg: 'bg-gradient-to-br from-teal-950 via-emerald-900 to-cyan-950',
    accent: '#00d4aa',
    video: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/generations/cmndiy1070058n4018hi1nnr7/848a6510-414d-4796-9da7-4a9a428a11fb/output_0.mp4',
  },
  {
    id: 3,
    slideKey: 's3' as const,
    bg: 'bg-black',
    accent: '#ffa040',
    image: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/generations/cmmxldri200gzus01z4fip7qf/04d6bbed-eb33-4e0a-ae27-8df3e14b6b92/output_0.png',
  },
];

const SLIDE_DURATION = 5000;
const TICK_MS = 50;

function LoginModalContent() {
  const router = useRouter();
  const { login } = useAuth();
  const { isOpen, planParam, initialMode, closeLoginModal } = useLoginModal();
  const tCommon = useTranslations('auth.common');
  const tForgot = useTranslations('auth.forgotPassword');
  const tVerify = useTranslations('auth.verifyEmail');
  const tSlides = useTranslations('auth.common.slides');

  const redirectAfterLogin = planParam ? `/checkout?plan=${planParam}` : '/home';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<'options' | 'email' | 'verify' | 'forgot'>('options');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Sync mode when the modal opens with a specific initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'register') {
        setView('email');
      }
    }
  }, [isOpen, initialMode]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [verifyStatus, setVerifyStatus] = useState<'input' | 'loading' | 'success' | 'error'>('input');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [resendVerifyLoading, setResendVerifyLoading] = useState(false);
  const [resendVerifySuccess, setResendVerifySuccess] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ── Carousel state ──────────────────────────────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progresses, setProgresses] = useState<number[]>(slides.map(() => 0));
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videosRef = useRef<Map<number, HTMLVideoElement>>(new Map());
  const advancedRef = useRef(false);
  const [loadedMedia, setLoadedMedia] = useState<Set<number>>(new Set());

  const markLoaded = useCallback((id: number) => {
    setLoadedMedia(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const setVideoRef = useCallback((id: number) => (el: HTMLVideoElement | null) => {
    if (el) videosRef.current.set(id, el);
    else videosRef.current.delete(id);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setProgresses((prev) => prev.map((_, i) => (i < index ? 100 : 0)));
    const targetVideo = videosRef.current.get(slides[index]?.id);
    if (targetVideo) targetVideo.currentTime = 0;
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % slides.length;
      setProgresses(slides.map((_, i) => (i < next ? 100 : 0)));
      const targetVideo = videosRef.current.get(slides[next]?.id);
      if (targetVideo) targetVideo.currentTime = 0;
      return next;
    });
  }, []);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    slides.forEach((s, idx) => {
      if (!s.video) return;
      const video = videosRef.current.get(s.id);
      if (!video) return;
      const onTimeUpdate = () => {
        if (!video.duration || isPaused) return;
        const pct = (video.currentTime / video.duration) * 100;
        setProgresses((prev) => prev.map((v, i) => (i === idx ? pct : v)));
      };
      const onEnded = () => {
        if (!advancedRef.current) {
          advancedRef.current = true;
          nextSlide();
        }
      };
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('ended', onEnded);
      cleanups.push(() => {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('ended', onEnded);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [isPaused, nextSlide, isOpen]);

  useEffect(() => {
    slides.forEach((s) => {
      if (!s.video) return;
      const video = videosRef.current.get(s.id);
      if (!video) return;
      if (s.id === currentSlide && !isPaused && isOpen) {
        video.play().catch(() => { });
      } else {
        video.pause();
      }
    });
  }, [currentSlide, isPaused, isOpen]);

  useEffect(() => {
    advancedRef.current = false;
  }, [currentSlide]);

  useEffect(() => {
    if (isPaused || slides[currentSlide]?.video) return;
    intervalRef.current = setInterval(() => {
      setProgresses((prev) => {
        const updated = [...prev];
        if (updated[currentSlide] >= 100) {
          if (!advancedRef.current) {
            advancedRef.current = true;
            nextSlide();
          }
          return updated;
        }
        updated[currentSlide] = Math.min(100, updated[currentSlide] + 100 / (SLIDE_DURATION / TICK_MS));
        return updated;
      });
    }, TICK_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPaused, currentSlide, nextSlide]);

  // ── Reset on open/close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setView('options');
      setMode('login');
      setName(''); setEmail(''); setPassword('');
      setError(''); setSuccess('');
      setForgotEmail(''); setForgotError(''); setForgotSent(false);
      setDigits(['', '', '', '', '', '']);
      setVerifyStatus('input'); setVerifyMessage(''); setResendVerifySuccess('');
      setCurrentSlide(0);
      setProgresses(slides.map(() => 0));
    } else {
      slides.forEach((s) => {
        if (!s.video) return;
        videosRef.current.get(s.id)?.pause();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (view === 'verify') setTimeout(() => inputsRef.current[0]?.focus(), 50);
  }, [view]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      for (let i = 0; i < 6; i++) newDigits[i] = pasted[i] || '';
      setDigits(newDigits);
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
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
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
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

  function handleLoginSuccess() {
    closeLoginModal();
    router.push(redirectAfterLogin);
  }

  async function submitCode(code: string) {
    setVerifyStatus('loading'); setVerifyMessage('');
    try {
      await api.auth.verifyEmail(code);
      await login(email, password);
      handleLoginSuccess();
    } catch (err) {
      setVerifyStatus('error');
      setVerifyMessage(err instanceof Error ? err.message : tVerify('invalidCode'));
    }
  }
  function handleVerifyRetry() {
    setDigits(['', '', '', '', '', '']);
    setVerifyStatus('input'); setVerifyMessage(''); setResendVerifySuccess('');
    setTimeout(() => inputsRef.current[0]?.focus(), 50);
  }
  async function handleResendVerify() {
    if (!email) return;
    setResendVerifyLoading(true); setResendVerifySuccess('');
    try {
      const res = await api.auth.resendVerificationByEmail(email);
      setResendVerifySuccess(res.message || tVerify('resendSuccess'));
    } catch (err) {
      setResendVerifySuccess(err instanceof Error ? err.message : tVerify('resendError'));
    } finally { setResendVerifyLoading(false); }
  }
  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault(); setForgotError(''); setForgotLoading(true);
    try {
      await api.auth.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : tForgot('error'));
    } finally { setForgotLoading(false); }
  }
  async function handleEmailSubmit(e: { preventDefault(): void }) {
    e.preventDefault(); setError(''); setSuccess(''); setShowResend(false); setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        handleLoginSuccess();
      } else {
        const referralCode = document.cookie.match(/(?:^|; )geraew-ref=([^;]*)/)?.[1];
        await api.auth.register(email, name, password, referralCode || undefined);
        setView('verify');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tCommon('genericError');
      setError(message);
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') setShowResend(true);
    } finally { setLoading(false); }
  }
  async function handleResendVerification() {
    setResendLoading(true); setError(''); setSuccess('');
    try {
      const res = await api.auth.resendVerificationByEmail(email);
      setSuccess(res.message); setShowResend(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tCommon('genericError'));
    } finally { setResendLoading(false); }
  }

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeLoginModal} />

      {/* Modal card — split layout on desktop */}
      <div className="relative bg-[#1a2123] p-2 z-10 flex h-[75vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

        {/* ── Left: Form panel ── */}
        <div className="relative flex w-full flex-col items-center justify-center overflow-y-auto bg-[#1a2123] px-8 py-8 lg:w-[420px] lg:shrink-0">
          {/* Close button */}
          <button
            onClick={closeLoginModal}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <Image src="/full_logo.svg" alt="Geraew AI" width={140} height={140} className="mix-blend-lighten" />
            <p className="mt-1 text-xs text-white/25">{tCommon('tagline')}</p>
          </div>

          {/* ── View: Options ── */}
          {view === 'options' && (
            <div className="w-full flex flex-col gap-3">
              <h2 className="text-center text-base font-semibold text-white mb-1">{tCommon('welcomeBack')}</h2>
              <p className="text-center text-xs text-white/35 mb-3">{tCommon('welcomeSubtitle')}</p>

              <button
                onClick={() => {
                  setGoogleLoading(true);
                  if (planParam) document.cookie = `geraew-plan-redirect=${planParam};path=/;max-age=600;samesite=lax`;
                  // Preservar referral code no cookie para Google OAuth
                  const ref = document.cookie.match(/(?:^|; )geraew-ref=([^;]*)/)?.[1];
                  if (ref) document.cookie = `geraew-ref=${ref};path=/;max-age=2592000;samesite=lax`;
                  window.location.href = '/api/v1/auth/google';
                }}
                disabled={loading || googleLoading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
                  </svg>
                )}
                {googleLoading ? tCommon('redirecting') : tCommon('continueWithGoogle')}
              </button>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-[10px] text-white/20">{tCommon('or')}</span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              <button
                onClick={() => setView('email')}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                <Mail className="h-4 w-4 opacity-60" />
                {tCommon('continueWithEmail')}
              </button>

              <p className="mt-3 text-center text-[11px] text-white/18 leading-relaxed">
                {tCommon.rich('legal', {
                  terms: (chunks) => (
                    <Link href="/termos-de-uso" onClick={closeLoginModal} className="text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">{chunks}</Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/politica-de-privacidade" onClick={closeLoginModal} className="text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">{chunks}</Link>
                  ),
                })}
              </p>
            </div>
          )}

          {/* ── View: Forgot password ── */}
          {view === 'forgot' && (
            <div className="w-full">
              <button onClick={() => { setView('email'); setForgotEmail(''); setForgotError(''); setForgotSent(false); }} className="mb-5 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> {tCommon('back')}
              </button>
              {forgotSent ? (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/15">
                    <CheckCircle className="h-7 w-7 text-[#a2dd00]" />
                  </div>
                  <h2 className="text-lg font-bold text-white">{tForgot('sentTitle')}</h2>
                  <p className="text-sm text-white/50">
                    {tForgot.rich('sentBody', {
                      email: forgotEmail,
                      strong: (chunks) => <span className="text-white/70">{chunks}</span>,
                    })}
                  </p>
                  <p className="text-xs text-white/30">{tForgot('checkSpam')}</p>
                  <button onClick={() => { setView('email'); setForgotEmail(''); setForgotSent(false); }} className="mt-1 flex items-center gap-1.5 text-xs text-[#a2dd00]/60 hover:text-[#a2dd00]/90 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> {tCommon('backToLogin')}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="mb-1 text-lg font-bold text-white">{tForgot('title')}</h2>
                  <p className="mb-5 text-xs text-white/40">{tForgot('description')}</p>
                  <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">{tCommon('labels.email')}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                        <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder={tCommon('placeholders.email')} className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]" />
                      </div>
                    </div>
                    {forgotError && <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">{forgotError}</p>}
                    <button type="submit" disabled={forgotLoading} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
                      {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tForgot('submit')}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── View: Verify email ── */}
          {view === 'verify' && (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-[#f3f0ed]">{tVerify('title')}</h2>
                <p className="mt-2 text-sm text-[#f3f0ed]/50">
                  {tVerify.rich('descriptionWithEmail', {
                    email,
                    strong: (chunks) => <span className="text-[#f3f0ed]/70">{chunks}</span>,
                  })}
                </p>
              </div>
              <div className="flex gap-3">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputsRef.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={6} value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    onPaste={handleDigitPaste}
                    disabled={verifyStatus === 'loading'}
                    className={`h-14 w-12 rounded-xl border text-center text-xl font-bold outline-none transition-all ${verifyStatus === 'error' ? 'border-red-400/40 bg-red-400/10 text-red-400' : 'border-white/[0.08] bg-white/[0.04] text-white focus:border-[#a2dd00]/50 focus:bg-white/[0.06]'} disabled:opacity-50`}
                  />
                ))}
              </div>
              {verifyStatus === 'loading' && (
                <div className="flex items-center gap-2 text-[#f3f0ed]/50"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">{tVerify('verifying')}</span></div>
              )}
              {verifyStatus === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2 text-red-400"><XCircle className="h-4 w-4" /><span className="text-sm">{verifyMessage}</span></div>
                  <button onClick={handleVerifyRetry} className="text-xs text-[#a2dd00]/70 hover:text-[#a2dd00] transition-colors">{tVerify('tryAgain')}</button>
                </div>
              )}
              {resendVerifySuccess && <p className="rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-3 py-2 text-xs text-[#a2dd00]">{resendVerifySuccess}</p>}
              <div className="flex flex-col items-center gap-3 pt-1">
                <button onClick={handleResendVerify} disabled={resendVerifyLoading} className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${resendVerifyLoading ? 'animate-spin' : ''}`} />
                  {resendVerifyLoading ? tVerify('resending') : tVerify('resend')}
                </button>
                <button onClick={() => { setView('email'); setVerifyStatus('input'); setDigits(['', '', '', '', '', '']); }} className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> {tCommon('back')}
                </button>
              </div>
            </div>
          )}

          {/* ── View: Email form ── */}
          {view === 'email' && (
            <div className="w-full">
              <button onClick={() => { setView('options'); setError(''); }} className="mb-5 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> {tCommon('back')}
              </button>
              <div className="mb-6 flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
                {(['login', 'register'] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setError(''); }} className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${mode === m ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}>
                    {m === 'login' ? tCommon('loginTab') : tCommon('registerTab')}
                  </button>
                ))}
              </div>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                {mode === 'register' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">{tCommon('labels.name')}</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={tCommon('placeholders.name')} className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">{tCommon('labels.email')}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tCommon('placeholders.email')} className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">{tCommon('labels.password')}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 pr-10 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {success && <p className="rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-3 py-2 text-xs text-[#a2dd00]">{success}</p>}
                {error && (
                  <div className="flex flex-col gap-2">
                    <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">{error}</p>
                    {showResend && (
                      <button type="button" onClick={handleResendVerification} disabled={resendLoading} className="text-xs text-[#a2dd00]/70 hover:text-[#a2dd00] transition-colors disabled:opacity-50">
                        {resendLoading ? tCommon('resending') : tCommon('resendVerification')}
                      </button>
                    )}
                  </div>
                )}
                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { setForgotEmail(email); setView('forgot'); }} className="text-[11px] text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">
                      {tCommon('forgotPasswordLink')}
                    </button>
                  </div>
                )}
                <button type="submit" disabled={loading} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a2123]/30 border-t-[#1a2123]" />
                  ) : mode === 'register' ? (
                    <><UserPlus className="h-4 w-4" />{tCommon('submitRegister')}</>
                  ) : (
                    <><LogIn className="h-4 w-4" />{tCommon('submitLogin')}</>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right: Carousel panel (desktop only) ── */}
        <div
          className="relative rounded-lg shadow-lg hidden lg:flex lg:flex-1 overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-700 ${s.bg} ${i === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            >
              {s.video ? (
                <video
                  ref={setVideoRef(s.id)}
                  src={s.video}
                  autoPlay
                  muted
                  playsInline
                  onCanPlay={() => markLoaded(s.id)}
                  className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-700 ${loadedMedia.has(s.id) ? '' : 'blur-xl scale-105'}`}
                />
              ) : s.image ? (
                <Image src={s.image} alt={tSlides(`${s.slideKey}.title`)} fill className={`object-cover transition-[filter] duration-700 ${loadedMedia.has(s.id) ? '' : 'blur-xl scale-105'}`} priority={i === 0} onLoad={() => markLoaded(s.id)} />
              ) : (
                <>
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />
                  <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] opacity-30 bg-white/20" />
                  <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-20 bg-white/10" />
                </>
              )}
            </div>
          ))}

          {/* Progress bars */}
          <div className="absolute top-6 left-6 right-6 flex gap-1.5 z-20">
            {slides.map((s, i) => (
              <button key={s.id} onClick={() => goToSlide(i)} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden cursor-pointer">
                <div className="h-full bg-white rounded-full transition-none" style={{ width: `${i < currentSlide ? 100 : i === currentSlide ? progresses[i] : 0}%` }} />
              </button>
            ))}
          </div>

          {/* Bottom scrim */}
          <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-none" />

          {/* Slide content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase transition-all duration-500 backdrop-blur-sm" style={{ borderColor: `${slide.accent}50`, color: slide.accent, backgroundColor: `${slide.accent}20` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: slide.accent }} />
              {tSlides(`${slide.slideKey}.tag`)}
            </div>
            <h2 key={`title-${currentSlide}`} className="text-2xl font-bold text-white leading-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
              {tSlides(`${slide.slideKey}.title`)}
            </h2>
            <p key={`desc-${currentSlide}`} className="text-sm text-white/70 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
              {tSlides(`${slide.slideKey}.description`)}
            </p>
            <div className="mt-4 flex gap-1.5">
              {slides.map((_, i) => (
                <button key={i} onClick={() => goToSlide(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/40'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginModal() {
  return (
    <Suspense>
      <LoginModalContent />
    </Suspense>
  );
}
