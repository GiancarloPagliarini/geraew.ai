'use client';

/** Lê um estado persistido do localStorage de forma segura (null em SSR/erro). */
export function loadPersisted<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Grava um estado no localStorage (ignora erros de cota/SSR). */
export function savePersisted<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignora (ex.: cota excedida) */
  }
}

/** Remove um estado persistido. */
export function clearPersisted(key: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignora */
  }
}
