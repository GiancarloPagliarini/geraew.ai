/**
 * Código de indicação — precisa casar com o @Matches do GoogleAuthDto/RegisterDto
 * da API (`/^[A-Za-z0-9_-]+$/` + MaxLength 50). Qualquer coisa fora disso faz a API
 * devolver 400 e derruba o login inteiro, então filtramos antes de enviar.
 *
 * Já aconteceu de links de campanha jogarem uma URL inteira no `?ref=`
 * (ex.: `?ref=https%3A%2F%2F...webp`), o que travava o login com Google por 30 dias
 * naquele navegador — o cookie ia cru pro backend a cada tentativa.
 */
export const REFERRAL_COOKIE = 'geraew-ref';

const VALID_CODE = /^[A-Za-z0-9_-]{1,50}$/;

/**
 * Normaliza um valor de referral vindo da URL ou do cookie.
 * Retorna null se não for um código válido (inclusive URLs, acentos, espaços).
 */
export function sanitizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // o cookie pode ter sido gravado com ou sem encode (histórico de duas
  // implementações diferentes), então tentamos decodificar antes de validar
  let value = raw.trim();
  try {
    value = decodeURIComponent(value).trim();
  } catch {
    /* valor com % solto — segue com o original e provavelmente cai no teste abaixo */
  }

  return VALID_CODE.test(value) ? value : null;
}

/** Lê o cookie de referral já validado. Apaga o cookie se o valor for inválido. */
export function readReferralCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const raw = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`))?.[1];
  if (!raw) return null;

  const code = sanitizeReferralCode(raw);
  // auto-limpeza: quem já pegou um cookie ruim volta a conseguir logar sozinho
  if (!code) {
    document.cookie = `${REFERRAL_COOKIE}=; path=/; max-age=0`;
    return null;
  }
  return code;
}

/** Grava o referral só se for um código válido. */
export function writeReferralCookie(raw: string | null | undefined): string | null {
  if (typeof document === 'undefined') return null;

  const code = sanitizeReferralCode(raw);
  if (!code) return null;

  const maxAge = 60 * 60 * 24 * 30; // 30 dias
  document.cookie = `${REFERRAL_COOKIE}=${code}; path=/; max-age=${maxAge}; SameSite=Lax`;
  return code;
}
