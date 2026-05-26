/**
 * Helpers da campanha de recuperação de churn involuntário.
 *
 * Quando o usuário clica num link de email da campanha (ex: Email 3 com cupom),
 * a URL traz `?recovery_promo=RECOVERY20`. Esse helper:
 *
 *  1) Captura o promo da URL na primeira página visitada
 *  2) Persiste em sessionStorage com TTL de 48h (igual à validade do cupom)
 *  3) Devolve o promo armazenado para os call sites de assinatura
 *  4) Limpa após uso bem-sucedido
 *
 * Whitelist no client (mas o backend também valida): apenas códigos conhecidos
 * são aceitos, evitando que querystrings arbitrárias vazem pro POST.
 */

const STORAGE_KEY = 'geraew:recoveryPromo';
const QUERY_PARAM = 'recovery_promo';
const TTL_MS = 48 * 60 * 60 * 1000; // 48h
const ALLOWED_PROMOS = new Set(['RECOVERY20']);

interface StoredPromo {
  code: string;
  capturedAt: number;
}

/**
 * Lê a URL atual e, se houver `?recovery_promo=...` válido, armazena
 * em sessionStorage. Chamar uma vez no boot da app (layout/auth context).
 * Safe para SSR — só executa no browser.
 */
export function captureRecoveryPromoFromUrl(): void {
  if (typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(QUERY_PARAM);
    if (!raw) return;

    const code = raw.toUpperCase().trim();
    if (!ALLOWED_PROMOS.has(code)) return;

    const payload: StoredPromo = { code, capturedAt: Date.now() };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Limpa o query param da URL para evitar re-captura/poluição visual
    url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState({}, '', url.toString());
  } catch {
    // sessionStorage pode estar indisponível (modo privado em alguns browsers)
  }
}

/**
 * Retorna o promo armazenado se ainda dentro do TTL.
 * Retorna undefined se nada armazenado, expirado ou inválido.
 */
export function getStoredRecoveryPromo(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as StoredPromo;
    if (!parsed?.code || !parsed?.capturedAt) return undefined;
    if (!ALLOWED_PROMOS.has(parsed.code)) return undefined;
    if (Date.now() - parsed.capturedAt > TTL_MS) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return undefined;
    }

    return parsed.code;
  } catch {
    return undefined;
  }
}

/**
 * Remove o promo armazenado — chamar após o checkout ser criado com sucesso
 * pra evitar reaplicação acidental num próximo fluxo.
 */
export function clearRecoveryPromo(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
