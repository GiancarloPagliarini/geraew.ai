export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
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

function readRawCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Lê os cookies _fbc/_fbp que o Pixel do Meta grava no navegador.
 * São a fonte autoritativa (mais atual) para o match do CAPI — por isso são
 * lidos ao vivo no momento do cadastro, não congelados no cookie de first-touch.
 */
function readFbCookies(): Pick<Attribution, 'fbc' | 'fbp'> {
  return {
    fbc: readRawCookie('_fbc'),
    fbp: readRawCookie('_fbp'),
  };
}

export function readAttribution(): Attribution | null {
  if (typeof document === 'undefined') return null;
  const raw = readRawCookie(COOKIE_NAME);
  const fb = readFbCookies();
  let stored: Attribution = {};
  if (raw) {
    try {
      stored = JSON.parse(raw) as Attribution;
    } catch {
      stored = {};
    }
  }
  // _fbc/_fbp ao vivo têm prioridade sobre o que estiver salvo.
  const merged: Attribution = { ...stored };
  if (fb.fbc) merged.fbc = fb.fbc;
  if (fb.fbp) merged.fbp = fb.fbp;

  return Object.keys(merged).length > 0 ? merged : null;
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
