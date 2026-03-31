'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      document.cookie = `geraew-ref=${encodeURIComponent(ref)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }
  }, [searchParams]);

  return null;
}
