'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { kindOf } from '@/components/gallery/kind';
import type { PendingGeneration } from '@/components/image/types';

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60_000;
/** tempo que o preview fica revelado antes de dar lugar ao card da lista */
const REVEAL_REMOVE_MS = 4000;

/**
 * Acompanha gerações via polling até concluir/falhar, expondo a lista de
 * pendências para os previews aurora (com url para o reveal ao concluir).
 */
export function useGenerationTracker() {
  const t = useTranslations('home');
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const [pending, setPending] = useState<PendingGeneration[]>([]);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const trackedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const track = useCallback(
    (id: string, prompt: string) => {
      if (!accessToken || trackedIds.current.has(id)) return;
      trackedIds.current.add(id);
      setPending((list) => [...list, { key: id, prompt }]);

      const started = Date.now();
      const remove = () => setPending((list) => list.filter((p) => p.key !== id));

      const tick = async () => {
        try {
          const gen = await api.generations.get(accessToken, id);
          const status = String(gen.status).toUpperCase();
          if (status === 'COMPLETED') {
            // revela a imagem dentro do próprio preview (aurora esmaece) e só
            // depois troca pelo card real da lista — sem piscar
            const output = gen.outputs?.[0];
            const url = output?.thumbnailUrl || output?.url;
            setPending((list) => list.map((p) => (p.key === id ? { ...p, url } : p)));
            queryClient.invalidateQueries({ queryKey: ['image-creations'] });
            queryClient.invalidateQueries({ queryKey: ['gallery'] });
            const kind = kindOf(gen.type);
            toast.success(
              kind === 'video'
                ? t('video.success')
                : kind === 'voice'
                  ? t('voice.success')
                  : t('image.success'),
            );
            const removeTimer = setTimeout(() => {
              timers.current.delete(removeTimer);
              remove();
            }, REVEAL_REMOVE_MS);
            timers.current.add(removeTimer);
            return;
          }
          if (status === 'FAILED') {
            remove();
            toast.error(gen.errorMessage || t('image.failed'));
            return;
          }
        } catch { /* erro transitório de rede — tenta de novo */ }
        if (Date.now() - started > POLL_TIMEOUT_MS) {
          remove();
          return;
        }
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          tick();
        }, POLL_INTERVAL_MS);
        timers.current.add(timer);
      };
      tick();
    },
    [accessToken, queryClient, t],
  );

  return { pending, track };
}
