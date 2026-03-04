'use client';

import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Fake login — salva flag e redireciona
    setTimeout(() => {
      localStorage.setItem('geraew-auth', 'true');
      router.push('/');
    }, 800);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a2123] px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="justify-center items-center flex flex-col gap-1">
            <Image
              src="/full_logo.svg"
              alt="Geraew AI"
              width={264}
              height={264}
              className="rounded-md mix-blend-lighten"
            />
            <p className="mt-1 text-xs text-[#f3f0ed]/40">
              Gerador de imagens com inteligência artificial
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/50"
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-10 rounded-lg border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.04] px-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 outline-none transition-colors focus:border-[#a2dd00]/50 focus:bg-[#f3f0ed]/[0.06]"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/50"
            >
              SENHA
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.04] px-3 pr-10 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 outline-none transition-colors focus:border-[#a2dd00]/50 focus:bg-[#f3f0ed]/[0.06]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f3f0ed]/30 transition-colors hover:text-[#f3f0ed]/60"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-[11px] text-[#a2dd00]/70 transition-colors hover:text-[#a2dd00]"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#a2dd00] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1a2123]/30 border-t-[#1a2123]" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span className="text-sm">Entrar</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#f3f0ed]/[0.07]" />
          <span className="text-[10px] text-[#f3f0ed]/25">ou</span>
          <div className="h-px flex-1 bg-[#f3f0ed]/[0.07]" />
        </div>

        {/* Sign up CTA */}
        <p className="text-center text-xs text-[#f3f0ed]/40">
          Não tem uma conta?{' '}
          <button
            type="button"
            className="font-semibold text-[#a2dd00]/80 transition-colors hover:text-[#a2dd00]"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
