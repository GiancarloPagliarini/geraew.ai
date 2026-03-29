import { BASE_URL } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SSECompletedResult {
  generationId: string;
  outputUrls: string[];
  processingTimeMs: number;
  creditsRefunded?: number;
  requestedCount?: number;
  actualCount?: number;
}

export interface SSEFailedResult {
  generationId: string;
  errorMessage: string;
  errorCode: string;
  creditsRefunded: number;
}

export interface SSECallbacks {
  onCompleted: (result: SSECompletedResult) => void;
  onFailed: (result: SSEFailedResult) => void;
  onError?: (error: unknown) => void;
}

// ─── SSE listener ─────────────────────────────────────────────────────────────

const MAX_RECONNECT_ATTEMPTS = 8;

/**
 * Opens an SSE connection for a specific generation using fetch + ReadableStream
 * (EventSource nativo não suporta headers de autenticação).
 *
 * Reconecta automaticamente com backoff exponencial caso a conexão caia.
 * Retorna um AbortController para fechar a conexão quando necessário.
 */
export function listenGeneration(
  generationId: string,
  accessToken: string,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController();

  const connect = async (attempt: number): Promise<void> => {
    if (controller.signal.aborted) return;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/generations/${generationId}/events`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`SSE connection failed: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;

          const event = JSON.parse(dataLine.slice(6));

          if (event.type === 'heartbeat') continue;

          if (event.status === 'completed') {
            callbacks.onCompleted({
              generationId: event.generationId,
              outputUrls: event.data.outputUrls,
              processingTimeMs: event.data.processingTimeMs,
              creditsRefunded: event.data.creditsRefunded,
              requestedCount: event.data.requestedCount,
              actualCount: event.data.actualCount,
            });
            return;
          }

          if (event.status === 'failed') {
            callbacks.onFailed({
              generationId: event.generationId,
              errorMessage: event.data.errorMessage,
              errorCode: event.data.errorCode,
              creditsRefunded: event.data.creditsRefunded,
            });
            return;
          }
        }
      }

      // Stream fechou sem evento final — reconectar
      if (!controller.signal.aborted && attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1_000 * 2 ** attempt, 30_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return connect(attempt + 1);
      }
      // Reconnects exhausted without completion — notify caller
      if (!controller.signal.aborted) {
        callbacks.onError?.(new Error('SSE reconnect attempts exhausted'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!controller.signal.aborted && attempt < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1_000 * 2 ** attempt, 30_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return connect(attempt + 1);
      }
      callbacks.onError?.(err);
    }
  };

  connect(0);

  return controller;
}
