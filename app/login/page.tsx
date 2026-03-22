'use client';

import { Eye, EyeOff, Mail, ArrowLeft, UserPlus, LogIn, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useGoogleLogin } from '@react-oauth/google';

const slides = [
  {
    id: 0,
    tag: 'Geração de Vídeos profissionais',
    title: 'Crie vídeos únicos com IA',
    description: 'Transforme texto em vídeo em segundos com modelos de última geração.',
    bg: 'bg-black',
    accent: '#a2dd00',
    video: 'https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/s3/ai-generations/generations/cmmwn2wq5007vus01furnxyh4/22c243fd-ce57-4c3e-aa8a-afadc811da46/output_0.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=2e3c372ae61232c26638c35c24b50688%2F20260318%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260318T225640Z&X-Amz-Expires=604800&X-Amz-Signature=7f71f694387a2b2614006ea57b8204993040e992c97f886d7ca619d03588dda0&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject',
  },
  {
    id: 1,
    tag: 'Identidade Visual',
    title: 'Sua marca, do seu jeito',
    description: 'Crie conteúdo visual consistente para campanhas, redes sociais e muito mais.',
    bg: 'bg-black',
    accent: '#ff6b9d',
    video: 'https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/s3/ai-generations/generations/cmmxjmvws00fyus01sxwu628l/5727b0ea-86d6-4887-8707-57eeb1db17bf/output_2.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=2e3c372ae61232c26638c35c24b50688%2F20260319%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260319T140847Z&X-Amz-Expires=604800&X-Amz-Signature=c3731915c49b12256ff55a1e49c813ecd37e17c347d933fd7748f12478edd98c&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject',
  },
  {
    id: 2,
    tag: 'Geração de Imagens',
    title: 'Imagine. Descreva. Crie.',
    description: 'Transforme qualquer ideia em imagem com modelos de última geração — rápido e sem limitações.',
    bg: 'bg-black',
    accent: '#ffa040',
    image: 'https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/s3/ai-generations/generations/cmmxldri200gzus01z4fip7qf/04d6bbed-eb33-4e0a-ae27-8df3e14b6b92/output_0.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=2e3c372ae61232c26638c35c24b50688%2F20260319%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260319T145712Z&X-Amz-Expires=604800&X-Amz-Signature=d94da0d7a749dc62dfe50e76804db9b1dc0677deb4a12395eb98b2c63c3ac3b6&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject',
  },
  {
    id: 3,
    tag: 'Personagens com IA',
    title: 'Personagens que parecem reais',
    description: 'Monte personagens únicos com controle total de estilo, etnia, expressão e muito mais.',
    bg: 'bg-gradient-to-br from-teal-950 via-emerald-900 to-cyan-950',
    accent: '#00d4aa',
    image: 'https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/s3/ai-generations/generations/cmmxwz1zt00zsus01w8hjs14n/2738ecf9-5b07-4fc0-ac89-589eb0b45600/output_0.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=2e3c372ae61232c26638c35c24b50688%2F20260319%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260319T202137Z&X-Amz-Expires=604800&X-Amz-Signature=ef47cb739b190f79059bd5fb95e9f78a579e062d999d89f578c3ecaf0d241e15&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject'
  },
];

const SLIDE_DURATION = 5000;
const TICK_MS = 50;

export default function LoginPage() {
  const router = useRouter();
  const { login, register, googleLogin } = useAuth();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [progresses, setProgresses] = useState<number[]>(slides.map(() => 0));
  const [isPaused, setIsPaused] = useState(false);

  const [view, setView] = useState<'options' | 'email'>('options');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleClick = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);
      try {
        await googleLogin(tokenResponse.access_token);
        router.push('/');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao entrar com Google';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Erro ao entrar com Google');
    },
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videosRef = useRef<Map<number, HTMLVideoElement>>(new Map());
  const advancedRef = useRef(false);

  const setVideoRef = useCallback((id: number) => (el: HTMLVideoElement | null) => {
    if (el) videosRef.current.set(id, el);
    else videosRef.current.delete(id);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setProgresses((prev) => prev.map((_, i) => (i < index ? 100 : 0)));
    // Rewind the target video if it has one
    const targetVideo = videosRef.current.get(slides[index]?.id);
    if (targetVideo) targetVideo.currentTime = 0;
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % slides.length;
      setProgresses(slides.map((_, i) => (i < next ? 100 : 0)));
      // Rewind the incoming video
      const targetVideo = videosRef.current.get(slides[next]?.id);
      if (targetVideo) targetVideo.currentTime = 0;
      return next;
    });
  }, []);

  // Attach timeupdate/ended to every video slide
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
  }, [isPaused, nextSlide]);

  // Sync play/pause: play only the active video slide, pause all others
  useEffect(() => {
    slides.forEach((s) => {
      if (!s.video) return;
      const video = videosRef.current.get(s.id);
      if (!video) return;
      if (s.id === currentSlide && !isPaused) {
        video.play().catch(() => { });
      } else {
        video.pause();
      }
    });
  }, [currentSlide, isPaused]);

  // Reset guard whenever the active slide changes
  useEffect(() => {
    advancedRef.current = false;
  }, [currentSlide]);

  // Timer-based progress for non-video slides only
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
        updated[currentSlide] = Math.min(
          100,
          updated[currentSlide] + 100 / (SLIDE_DURATION / TICK_MS)
        );
        return updated;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, currentSlide, nextSlide]);

  // Format phone as user types: (11) 99999-8888
  function formatPhoneDisplay(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
  }

  async function handleEmailSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      setLoading(true);
      try {
        await login(email, password);
        router.push('/');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
        setError(message);
      } finally {
        setLoading(false);
      }
    } else {
      // Register directly (phone verification happens inside the platform)
      setLoading(true);
      try {
        await register(email, name, password, phone);
        router.push('/');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
  }

  const slide = slides[currentSlide];

  return (
    <div className="flex min-h-screen bg-black">
      {/* ── Left panel ── */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-8 py-12 lg:w-[620px] lg:px-12 bg-[#1a2123]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/full_logo.svg"
            alt="Geraew AI"
            width={180}
            height={180}
            className="mix-blend-lighten"
          />
          <p className="mt-2 text-xs text-white/25">
            Gerador de imagens com inteligência artificial
          </p>
        </div>

        {/* ── View: Options ── */}
        {view === 'options' && (
          <div className="w-full flex flex-col gap-3">
            <h2 className="text-center text-base font-semibold text-white mb-1">
              Bem-vindo de volta
            </h2>
            <p className="text-center text-xs text-white/35 mb-3">
              Entre ou crie sua conta para começar a criar
            </p>

            {/* Google */}
            <button
              onClick={() => handleGoogleClick()}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" />
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" />
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" />
              </svg>
              Continuar com Google
            </button>

            {error && view === 'options' && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] text-white/20">ou</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            {/* Email */}
            <button
              onClick={() => setView('email')}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <Mail className="h-4 w-4 opacity-60" />
              Continuar com Email
            </button>

            <p className="mt-4 text-center text-[11px] text-white/18 leading-relaxed">
              Ao continuar, você concorda com nossos{' '}
              <span className="text-[#a2dd00]/50 cursor-pointer hover:text-[#a2dd00]/80 transition-colors">
                Termos de Uso
              </span>{' '}
              e{' '}
              <span className="text-[#a2dd00]/50 cursor-pointer hover:text-[#a2dd00]/80 transition-colors">
                Política de Privacidade
              </span>
            </p>
          </div>
        )}

        {/* ── View: Email form ── */}
        {view === 'email' && (
          <div className="w-full">
            <button
              onClick={() => { setView('options'); setError(''); }}
              className="mb-5 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>

            {/* Mode toggle */}
            <div className="mb-6 flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${mode === m
                    ? 'bg-white/10 text-white'
                    : 'text-white/30 hover:text-white/50'
                    }`}
                >
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
              {mode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
                    NOME
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
                  SENHA
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
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
                      required
                      value={formatPhoneDisplay(phone)}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-8888"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-[4.5rem] pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
                    />
                  </div>
                  <p className="text-[10px] text-white/25">
                    Enviaremos um SMS com o codigo de verificacao
                  </p>
                </div>
              )}

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </p>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[11px] text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'register' && phone.length < 10)}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] font-bold text-[#1a2123] text-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a2123]/30 border-t-[#1a2123]" />
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Criar conta
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>

      {/* ── Right panel – Stories carousel ── */}
      <div
        className="relative hidden lg:flex lg:flex-1 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides */}
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${s.bg} ${i === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
          >
            {s.video ? (
              /* Video slide */
              <video
                ref={setVideoRef(s.id)}
                src={s.video}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : s.image ? (
              /* Image slide */
              <Image
                src={s.image}
                alt={s.title}
                fill
                className="object-cover"
                priority={i === 0}
              />
            ) : (
              /* Gradient slide */
              <>
                <div className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
                  }}
                />
                <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full blur-[120px] opacity-30 bg-white/20" />
                <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full blur-[100px] opacity-20 bg-white/10" />
              </>
            )}
          </div>
        ))}

        {/* Progress bars – top */}
        <div className="absolute top-6 left-8 right-8 flex gap-1.5 z-20">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToSlide(i)}
              className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden cursor-pointer"
            >
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: `${i < currentSlide ? 100 : i === currentSlide ? progresses[i] : 0}%`,
                }}
              />
            </button>
          ))}
        </div>

        {/* Bottom scrim – strong gradient for readability */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-linear-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-none" />

        {/* Content – bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase transition-all duration-500 backdrop-blur-sm"
            style={{
              borderColor: `${slide.accent}50`,
              color: slide.accent,
              backgroundColor: `${slide.accent}20`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: slide.accent }}
            />
            {slide.tag}
          </div>

          <h2
            key={`title-${currentSlide}`}
            className="text-2xl font-bold text-white leading-tight mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
          >
            {slide.title}
          </h2>

          <p
            key={`desc-${currentSlide}`}
            className="text-sm text-white/70 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
          >
            {slide.description}
          </p>

          {/* Slide dots */}
          <div className="mt-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/25 hover:bg-white/40'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
