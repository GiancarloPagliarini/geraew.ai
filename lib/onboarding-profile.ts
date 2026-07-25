/**
 * Opções e helpers do cadastro de perfil (nicho + contato) pedido no primeiro
 * acesso à plataforma.
 *
 * Os ids precisam bater com `src/users/users.constants.ts` da API — é ela que
 * valida o payload. Os rótulos vivem em `messages/<locale>/onboarding.json`,
 * na chave `onboarding.options.*`.
 */

/** Quem o usuário é — passo 1 do formulário. */
export const PROFILE_TYPES = [
  'SELLER',
  'AFFILIATE',
  'PHOTOGRAPHER',
  'SOCIAL_MEDIA',
  'BRAND_AGENCY',
  'AI_SERVICES',
  'OTHER',
] as const;

/** Nicho em que atua — passo 2, obrigatório. */
export const NICHES = [
  'FASHION',
  'BEAUTY',
  'HEALTH',
  'FITNESS',
  'HOME',
  'ELECTRONICS',
  'PET',
  'FOOD',
  'INFOPRODUCT',
  'SERVICES',
  'OTHER',
] as const;

/** Onde vende / publica hoje — passo 2, opcional e múltipla escolha. */
export const SALES_CHANNELS = [
  'TIKTOK_SHOP',
  'SHOPEE',
  'MERCADO_LIVRE',
  'AMAZON',
  'INSTAGRAM',
  'META_ADS',
  'OWN_STORE',
  'WHATSAPP',
  'NOT_SELLING_YET',
] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];
export type Niche = (typeof NICHES)[number];
export type SalesChannel = (typeof SALES_CHANNELS)[number];

/**
 * Opção que abre uma caixa de texto no formulário — vale para perfil e para
 * nicho. A API exige o texto quando ela é escolhida.
 */
export const OTHER_OPTION = 'OTHER';

/** Limite do texto livre de "Outro" (mesmo valor da API). */
export const OTHER_MAX_LENGTH = 60;

/** Colapsa espaços e corta no limite — espelha o normalizador da API. */
export function normalizeFreeText(value: string): string {
  return value.replace(/\s+/g, ' ').slice(0, OTHER_MAX_LENGTH);
}

// ─── Telefone ────────────────────────────────────────────────────────────────

export interface DialCode {
  /** ISO 3166-1 alpha-2 — vira o rótulo do seletor (ex.: "BR +55"). */
  country: string;
  /** Prefixo internacional, sem "+". */
  dial: string;
}

/** Países dos mercados atendidos, Brasil primeiro. */
export const DIAL_CODES: DialCode[] = [
  { country: 'BR', dial: '55' },
  { country: 'PT', dial: '351' },
  { country: 'US', dial: '1' },
  { country: 'ES', dial: '34' },
  { country: 'MX', dial: '52' },
  { country: 'AR', dial: '54' },
  { country: 'CO', dial: '57' },
  { country: 'CL', dial: '56' },
  { country: 'PY', dial: '595' },
];

/** DDI padrão a partir do locale ativo (pt-BR → 55, es → 52, en → 1). */
export function defaultDialCode(locale: string): DialCode {
  const byLocale: Record<string, string> = { 'pt-BR': 'BR', pt: 'BR', es: 'MX', en: 'US' };
  const country = byLocale[locale] ?? byLocale[locale.split('-')[0]] ?? 'BR';
  return DIAL_CODES.find((c) => c.country === country) ?? DIAL_CODES[0];
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Máximo de dígitos do número local. O E.164 aceita 15 dígitos contando o DDI,
 * então o limite geral é 15 menos o tamanho do prefixo.
 */
export function maxLocalDigits(dial: string): number {
  return dial === '55' ? 11 : 15 - dial.length;
}

/** Máscara brasileira progressiva: (11) 91234-5678. */
export function formatPhoneBR(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Formata conforme o DDI (só o BR tem máscara própria hoje). */
export function formatPhone(digits: string, dial: string): string {
  return dial === '55' ? formatPhoneBR(digits) : digits.slice(0, maxLocalDigits(dial));
}

/**
 * Valida o número local. No Brasil exige DDD 11–99 e celular de 9 dígitos
 * começando em 9; nos outros países aceita de 8 dígitos ao limite do E.164.
 */
export function isValidPhone(digits: string, dial: string): boolean {
  if (dial === '55') {
    if (digits.length !== 11) return false;
    const ddd = Number(digits.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    return digits[2] === '9';
  }
  return digits.length >= 8 && digits.length <= maxLocalDigits(dial);
}

/** Monta o E.164 enviado à API. */
export function toE164(digits: string, dial: string): string {
  return `+${dial}${digits}`;
}

/** Limpa o que o usuário digitar no campo do Instagram (aceita URL colada). */
export function normalizeInstagramHandle(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, 30);
}
