'use client';

import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email. Tente novamente.');
    } finally {
      setLoading(false);
    }
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

        {!sent ? (
          <>
            <button
              onClick={() => router.push('/login')}
              className="mb-5 flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>

            <h1 className="mb-2 text-lg font-bold text-white">Esqueceu sua senha?</h1>
            <p className="mb-6 text-xs text-white/40">
              Digite seu email e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold tracking-[0.12em] text-white/40">
                  EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-3 text-sm text-white placeholder:text-white/20 outline-none transition-colors focus:border-[#a2dd00]/40 focus:bg-white/[0.06]"
                  />
                </div>
              </div>

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
                  'Enviar link de reset'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
              <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
            </div>
            <h1 className="text-xl font-bold text-white">Email enviado!</h1>
            <p className="text-sm text-white/50">
              Se o email <span className="text-white/70">{email}</span> estiver cadastrado, você
              receberá um link para redefinir sua senha.
            </p>
            <p className="text-xs text-white/30">Verifique também sua pasta de spam.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 flex items-center gap-1.5 text-xs text-[#a2dd00]/60 hover:text-[#a2dd00]/90 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
