import { useEffect, useRef } from 'react';
import { api, Generation } from '@/lib/api';

interface RecoveryCallbacks {
  onCompleted: (generation: Generation) => void;
  onFailed: (generation: Generation) => void;
}

/**
 * Listens for `visibilitychange` events and immediately checks the generation
 * status via API when the page becomes visible during an active generation.
 *
 * This fixes the issue where SSE connections and setInterval-based polling get
 * suspended by mobile browsers when the user switches apps, causing progress
 * to appear stuck at ~90% even though the generation already completed.
 */
export function useGenerationRecovery(
  generationId: string | null,
  accessToken: string | null,
  isGenerating: boolean,
  callbacks: RecoveryCallbacks,
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // Track whether recovery is already in-flight to avoid duplicate API calls
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!isGenerating || !generationId || !accessToken) return;

    const handleVisibilityChange = async () => {
      if (document.hidden || checkingRef.current) return;

      checkingRef.current = true;
      try {
        const generation = await api.generations.get(accessToken, generationId);
        if (generation.status === 'COMPLETED' && generation.outputs?.length) {
          cbRef.current.onCompleted(generation);
        } else if (generation.status === 'FAILED') {
          cbRef.current.onFailed(generation);
        }
      } catch {
        // Silent — SSE or polling will handle
      } finally {
        checkingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isGenerating, generationId, accessToken]);
}
