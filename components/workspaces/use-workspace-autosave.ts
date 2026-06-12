'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api, type WorkspaceContentInput } from '@/lib/api';

const SAVE_DEBOUNCE_MS = 2000;

/**
 * Autosave do canvas: acumula as mudanças (nodes/edges/viewport) e envia um
 * único PATCH ~2s após a última alteração. Em caso de falha, o conteúdo volta
 * ao buffer e é reenviado no próximo ciclo.
 */
export function useWorkspaceAutosave(
  workspaceId: string | null,
  accessToken: string | null,
) {
  const pending = useRef<WorkspaceContentInput>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!accessToken || !workspaceId) return;
    const payload = pending.current;
    if (!payload.nodes && !payload.edges && !payload.viewport && !payload.thumbnailUrl) return;
    pending.current = {};
    try {
      await api.workspaces.update(accessToken, workspaceId, payload);
    } catch {
      // devolve ao buffer sem sobrescrever mudanças mais novas
      pending.current = { ...payload, ...pending.current };
    }
  }, [accessToken, workspaceId]);

  const persist = useCallback(
    (partial: WorkspaceContentInput) => {
      pending.current = { ...pending.current, ...partial };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // flush final ao desmontar (troca de rota)
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return persist;
}
