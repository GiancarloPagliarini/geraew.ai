'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/tracking';

export function TrackingCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
