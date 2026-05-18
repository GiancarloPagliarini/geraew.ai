export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
  landing_page?: string;
};

const COOKIE_NAME = 'geraew_attribution';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const TRACKABLE_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid',
] as const;

function setCookie(value: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=${MAX_AGE_SECONDS};samesite=lax`;
}

export function readAttribution(): Attribution | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as Attribution;
  } catch {
    return null;
  }
}

/**
 * Captura UTMs e click ids da URL atual e grava em cookie (first-touch).
 * Só sobrescreve um cookie existente se a URL atual trouxer novos UTMs
 * — assim quem chega direto numa página interna não apaga a atribuição original.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const captured: Attribution = {};

  for (const key of TRACKABLE_KEYS) {
    const value = params.get(key);
    if (value) captured[key] = value.slice(0, 512);
  }

  if (Object.keys(captured).length === 0) return;

  if (readAttribution()) return;

  captured.referrer = document.referrer ? document.referrer.slice(0, 1024) : undefined;
  captured.landing_page = (window.location.pathname + window.location.search).slice(0, 1024);

  setCookie(JSON.stringify(captured));
}
