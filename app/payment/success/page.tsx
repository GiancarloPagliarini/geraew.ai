'use client';

import { CheckCircle, ArrowRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { trackPurchase } from '@/lib/pixel';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useTranslations('checkout.success');

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    queryClient.invalidateQueries({ queryKey: ['user', 'me'] });

    // Purchase no navegador. eventId = session_id do Stripe → mesmo id do CAPI
    // (orderId no backend), então o Meta deduplica browser + servidor.
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      trackPurchase({ eventId: sessionId });
    }
  }, [queryClient, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#1a2123] px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#a2dd00]/15">
          <CheckCircle className="h-8 w-8 text-[#a2dd00]" />
        </div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">{t('title')}</h1>
        <p className="max-w-md text-sm text-[#f3f0ed]/50">
          {t('description')}
        </p>
      </div>
      <button
        onClick={() => router.push('/workspace')}
        className="flex items-center gap-2 rounded-xl bg-[#a2dd00] px-6 py-3 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-[0.98]"
      >
        {t('cta')}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
