'use client';

import { CheckCircle, XCircle, Loader2, ArrowRight, MailOpen } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificação não encontrado.');
      return;
    }

    api.auth
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Erro ao verificar email.');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a2123] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {status === 'loading' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Loader2 className="h-8 w-8 animate-spin text-[#a2dd00]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f3f0ed]">Verificando email...</h1>
            <p className="max-w-md text-sm text-[#f3f0ed]/50">Aguarde um momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
              <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f3f0ed]">Email verificado!</h1>
            <p className="max-w-md text-sm text-[#f3f0ed]/50">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-400/15">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-[#f3f0ed]">Falha na verificação</h1>
            <p className="max-w-md text-sm text-[#f3f0ed]/50">{message}</p>
          </>
        )}
      </div>

      {status === 'success' && (
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Ir para o editor
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => router.push('/login')}
            className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <MailOpen className="h-4 w-4" />
            Ir para o login
          </button>
        </div>
      )}
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
