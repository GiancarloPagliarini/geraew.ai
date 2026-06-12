'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 55;
const DELETE_MS = 22;
const PAUSE_FULL_MS = 2600;
const PAUSE_EMPTY_MS = 700;

/**
 * Efeito de digitação em loop para placeholders: digita o texto, pausa,
 * apaga e recomeça. Com `cursor` (default), mostra o "|" enquanto digita/apaga.
 */
export function useTypewriter(text: string, { cursor = true } = {}): string {
  const [state, setState] = useState({ key: text, count: 0, deleting: false });

  // reset síncrono quando o texto muda (ex.: troca de idioma)
  if (state.key !== text) setState({ key: text, count: 0, deleting: false });

  const { count, deleting } = state;

  useEffect(() => {
    const len = text.length;
    const atFull = !deleting && count >= len;
    const atEmpty = deleting && count <= 0;
    const delay = atFull ? PAUSE_FULL_MS : atEmpty ? PAUSE_EMPTY_MS : deleting ? DELETE_MS : TYPE_MS;

    const timer = setTimeout(() => {
      setState((s) => {
        if (s.key !== text) return s;
        if (!s.deleting) {
          return s.count >= len ? { ...s, deleting: true } : { ...s, count: s.count + 1 };
        }
        return s.count <= 0 ? { ...s, deleting: false } : { ...s, count: s.count - 1 };
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [count, deleting, text]);

  const atFull = !deleting && count >= text.length;
  if (atFull) return text;
  return cursor ? `${text.slice(0, count)}|` : text.slice(0, count);
}
