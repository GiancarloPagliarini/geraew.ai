'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { readReferralCookie, writeReferralCookie } from '@/lib/referral';

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    // grava só código válido; sem ?ref= na URL, revalida o cookie existente
    // (apaga sozinho se for lixo de campanha antiga)
    if (ref) writeReferralCookie(ref);
    else readReferralCookie();
  }, [searchParams]);

  return null;
}
