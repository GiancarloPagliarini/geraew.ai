import type { BillingInterval, Plan, CreditPackage } from './api';
import type { LucideIcon } from 'lucide-react';
import { Flame, Zap, Trophy, Users, TestTubeDiagonal, Sprout, TrendingUp, Crown } from 'lucide-react';

export const PLAN_ORDER = ['free', 'ultra-basic', 'starter', 'basic', 'creator', 'pro', 'advanced', 'studio'];

/* ── Plano anual ── */

/**
 * Desconto do anual (espelha ANNUAL_DISCOUNT_PERCENT do backend). Só para
 * textos genéricos — o preço e o desconto de cada plano vêm de `plan.annual`.
 */
export const ANNUAL_DISCOUNT_PERCENT = 20;

export type PlanChangeAction = 'create' | 'current' | 'upgrade' | 'downgrade';

export function parseBillingInterval(value: unknown): BillingInterval {
  return value === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
}

/**
 * O que acontece ao escolher um plano + ciclo, dado o plano atual. Espelha a
 * matriz do backend (subscriptions/plan-change.ts):
 * - mensal → mensal superior, ou → anual do mesmo plano/superior: upgrade na hora;
 * - anual → anual superior: upgrade na hora (paga a diferença proporcional);
 * - qualquer outra troca (plano menor, anual → mensal): agendada pra renovação
 *   (`downgrade`), feita em "Gerenciar assinatura".
 */
export function resolvePlanChange(params: {
  targetSlug: string;
  targetInterval: BillingInterval;
  currentSlug: string | null;
  currentInterval: BillingInterval;
  hasActiveSub: boolean;
}): PlanChangeAction {
  const { targetSlug, targetInterval, currentSlug, currentInterval, hasActiveSub } = params;
  if (!hasActiveSub || !currentSlug || currentSlug === 'free') return 'create';
  if (currentSlug === targetSlug && currentInterval === targetInterval) return 'current';

  const currentIdx = PLAN_ORDER.indexOf(currentSlug);
  const targetIdx = PLAN_ORDER.indexOf(targetSlug);

  if (currentInterval === 'MONTHLY') {
    if (targetInterval === 'MONTHLY') return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
    return targetIdx >= currentIdx ? 'upgrade' : 'downgrade';
  }
  return targetInterval === 'YEARLY' && targetIdx > currentIdx ? 'upgrade' : 'downgrade';
}

export interface PlanIntervalPrice {
  /** se o plano pode ser assinado nesse ciclo (anual exige `plan.annual`) */
  available: boolean;
  /** valor exibido como "por mês" no card */
  perMonthCents: number;
  /** valor cobrado a cada ciclo (mês ou ano) */
  billedCents: number;
  /** preço "de" riscado no anual (o mensal cheio) */
  compareAtCents: number | null;
  discountPercent: number | null;
}

export function getPlanIntervalPrice(plan: Plan, interval: BillingInterval): PlanIntervalPrice {
  if (interval === 'YEARLY' && plan.annual) {
    return {
      available: true,
      perMonthCents: plan.annual.monthlyEquivalentCents,
      billedCents: plan.annual.priceCents,
      compareAtCents: plan.priceCents,
      discountPercent: plan.annual.discountPercent,
    };
  }
  return {
    available: interval === 'MONTHLY',
    perMonthCents: plan.priceCents,
    billedCents: plan.priceCents,
    compareAtCents: null,
    discountPercent: null,
  };
}

/** Algum plano pago tem opção anual? (sem isso o seletor Mensal/Anual nem aparece) */
export function plansHaveAnnual(plans: Plan[]): boolean {
  return plans.some((p) => p.priceCents > 0 && !!p.annual);
}

/**
 * Parâmetro `plan` do /checkout: "pro" (mensal) ou "pro:yearly" (anual). Fica
 * num valor só para atravessar login, cookie do OAuth e redirect sem mudança.
 */
export function encodePlanParam(slug: string, interval: BillingInterval): string {
  return interval === 'YEARLY' ? `${slug}:yearly` : slug;
}

export function parsePlanParam(raw: string | null): { slug: string; interval: BillingInterval } | null {
  if (!raw) return null;
  const [slug, interval] = raw.split(':');
  if (!slug) return null;
  return { slug, interval: interval === 'yearly' ? 'YEARLY' : 'MONTHLY' };
}

/**
 * @deprecated Use `editorPlans.subtitles.<slug>` via next-intl.
 * Kept for backward compatibility with non-i18n callers.
 */
export const PLAN_SUBTITLES: Record<string, string> = {
  'ultra-basic': 'Iniciante',
  starter: 'Explorador',
  basic: 'Essencial',
  creator: 'Criador',
  pro: 'Produtor',
  advanced: 'Avançado',
  studio: 'Profissional',
};

export interface PlanGenerationExample {
  label: string;
  /** @deprecated Use `countNumber` + `unit` + translate via `editorPlans.units.<unit>`. */
  count: string;
  blocked?: boolean;
}

export type GenerationUnit = 'image' | 'generation' | 'video' | 'audio' | 'voiceClone';

export interface PlanGenerationEntry {
  label: string;
  countNumber: number;
  unit: GenerationUnit;
  blocked?: boolean;
}

/**
 * Locale-agnostic generation examples. Use this with
 * `useTranslations('editorPlans')` to render `units.<unit>` with ICU plural.
 */
export const PLAN_GENERATION_ENTRIES: Record<string, PlanGenerationEntry[]> = {
  free: [
    { label: 'Nano Banana 2', countNumber: 3, unit: 'image' },
    { label: 'Motion Control', countNumber: 1, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 2, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 0, unit: 'video', blocked: true },
    { label: 'Áudio (TTS)', countNumber: 8, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 0, unit: 'voiceClone', blocked: true },
  ],
  'ultra-basic': [
    { label: 'Nano Banana 2', countNumber: 7, unit: 'image' },
    { label: 'Motion Control', countNumber: 1, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 2, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 0, unit: 'video', blocked: true },
    { label: 'Áudio (TTS)', countNumber: 20, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 1, unit: 'voiceClone' },
  ],
  starter: [
    { label: 'Nano Banana 2', countNumber: 44, unit: 'image' },
    { label: 'Motion Control', countNumber: 5, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 3, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 1, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 100, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 3, unit: 'voiceClone' },
  ],
  basic: [
    { label: 'Nano Banana 2', countNumber: 77, unit: 'image' },
    { label: 'Motion Control', countNumber: 10, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 5, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 2, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 200, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 5, unit: 'voiceClone' },
  ],
  creator: [
    { label: 'Nano Banana 2', countNumber: 133, unit: 'image' },
    { label: 'Motion Control', countNumber: 17, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 9, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 4, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 340, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 8, unit: 'voiceClone' },
  ],
  pro: [
    { label: 'Nano Banana 2', countNumber: 333, unit: 'image' },
    { label: 'Motion Control', countNumber: 42, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 23, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 10, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 850, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 12, unit: 'voiceClone' },
  ],
  advanced: [
    { label: 'Nano Banana 2', countNumber: 555, unit: 'image' },
    { label: 'Motion Control', countNumber: 71, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 38, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 17, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 1400, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 15, unit: 'voiceClone' },
  ],
  studio: [
    { label: 'Nano Banana 2', countNumber: 888, unit: 'image' },
    { label: 'Motion Control', countNumber: 114, unit: 'generation' },
    { label: 'Veo 3.1 Fast', countNumber: 61, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 27, unit: 'video' },
    { label: 'Áudio (TTS)', countNumber: 2280, unit: 'audio' },
    { label: 'Clonar voz', countNumber: 15, unit: 'voiceClone' },
  ],
};

/**
 * Quantidade estimada de gerações inclusas no plano via créditos
 * (vídeos = Veo Fast 720p sem áudio; imagens = NB2 1K). Exibido no
 * dialog de planos para o usuário ter ideia do volume.
 */
export interface PlanGenerationsIncluded {
  videos: number;
  images: number;
}
export const PLAN_GENERATIONS_INCLUDED: Record<string, PlanGenerationsIncluded> = {
  'ultra-basic': { videos: 16, images: 7 },
  starter: { videos: 29, images: 44 },
  basic: { videos: 39, images: 77 },
  creator: { videos: 56, images: 133 },
  pro: { videos: 116, images: 333 },
  advanced: { videos: 182, images: 555 },
  studio: { videos: 282, images: 888 },
};

/**
 * Resumo dos modelos liberados no modo ilimitado por plano. O modo ilimitado
 * foi descontinuado: o mapa fica vazio para nenhum card exibir o bloco
 * "Modo Ilimitado". A oferta antiga era (chaves de `editorPlans.unlimited.features.*`):
 * creator: veoFast720 · pro: veoFast720And1080 · advanced: veoBoth720, nb2_1K ·
 * studio: veoBoth720And1080, nbBoth1K.
 */
export const PLAN_UNLIMITED_FEATURE_KEYS: Record<string, string[]> = {};

/**
 * Quantidade máxima de vozes salvas por plano (mirror do backend
 * `voices.constants.ts` → VOICE_PROFILE_QUOTAS).
 */
export const PLAN_SAVED_VOICES_QUOTAS: Record<string, number> = {
  free: 0,
  'ultra-basic': 1,
  starter: 3,
  basic: 5,
  creator: 8,
  pro: 12,
  advanced: 15,
  studio: 15,
};

/**
 * @deprecated Use `PLAN_GENERATION_ENTRIES` + translations instead.
 * Retained for backward compatibility.
 */
export const PLAN_GENERATIONS: Record<string, PlanGenerationExample[]> = {
  free: [
    { label: 'Nano Banana 2', count: '3 Imagens' },
    { label: 'Motion Control', count: '1 Geração' },
    { label: 'Veo 3.1 Fast', count: '2 Vídeos Grátis' },
    { label: 'Veo 3.1 Quality', count: 'Bloqueado', blocked: true },
    { label: 'Áudio (TTS)', count: '8 Áudios' },
    { label: 'Clonar voz', count: 'Bloqueado', blocked: true },
  ],
  'ultra-basic': [
    { label: 'Nano Banana 2', count: '7 Imagens' },
    { label: 'Motion Control', count: '1 Geração' },
    { label: 'Veo 3.1 Fast', count: '2 Vídeos' },
    { label: 'Veo 3.1 Quality', count: 'Bloqueado', blocked: true },
    { label: 'Áudio (TTS)', count: '20 Áudios' },
    { label: 'Clonar voz', count: '1 Clonagem' },
  ],
  starter: [
    { label: 'Nano Banana 2', count: '44 Imagens' },
    { label: 'Motion Control', count: '5 Gerações' },
    { label: 'Veo 3.1 Fast', count: '3 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '1 Vídeo' },
    { label: 'Áudio (TTS)', count: '100 Áudios' },
    { label: 'Clonar voz', count: '3 Clonagens' },
  ],
  basic: [
    { label: 'Nano Banana 2', count: '77 Imagens' },
    { label: 'Motion Control', count: '10 Gerações' },
    { label: 'Veo 3.1 Fast', count: '5 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '2 Vídeos' },
    { label: 'Áudio (TTS)', count: '200 Áudios' },
    { label: 'Clonar voz', count: '5 Clonagens' },
  ],
  creator: [
    { label: 'Nano Banana 2', count: '133 Imagens' },
    { label: 'Motion Control', count: '17 Gerações' },
    { label: 'Veo 3.1 Fast', count: '9 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '4 Vídeos' },
    { label: 'Áudio (TTS)', count: '340 Áudios' },
    { label: 'Clonar voz', count: '8 Clonagens' },
  ],
  pro: [
    { label: 'Nano Banana 2', count: '333 Imagens' },
    { label: 'Motion Control', count: '42 Gerações' },
    { label: 'Veo 3.1 Fast', count: '23 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '10 Vídeos' },
    { label: 'Áudio (TTS)', count: '850 Áudios' },
    { label: 'Clonar voz', count: '12 Clonagens' },
  ],
  advanced: [
    { label: 'Nano Banana 2', count: '555 Imagens' },
    { label: 'Motion Control', count: '71 Gerações' },
    { label: 'Veo 3.1 Fast', count: '38 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '17 Vídeos' },
    { label: 'Áudio (TTS)', count: '1.400 Áudios' },
    { label: 'Clonar voz', count: '15 Clonagens' },
  ],
  studio: [
    { label: 'Nano Banana 2', count: '888 Imagens' },
    { label: 'Motion Control', count: '114 Gerações' },
    { label: 'Veo 3.1 Fast', count: '61 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '27 Vídeos' },
    { label: 'Áudio (TTS)', count: '2.280 Áudios' },
    { label: 'Clonar voz', count: '15 Clonagens' },
  ],
};

/* ── Boost packages ── */

export interface BoostMeta {
  label: string;
  description: string;
}

export type BoostMetaKey = 'mini' | 'plus' | 'pro-pack' | 'mega' | 'ultra';

/** @deprecated Use `getBoostMetaKey` + `editorPlans.boost.<key>.{label,description}`. */
export const BOOST_META: Record<BoostMetaKey, BoostMeta> = {
  'mini': { label: 'Mini', description: 'Recarrega rápida para continuar gerando' },
  'plus': { label: 'Plus', description: 'Um empurrão extra para o dia a dia' },
  'pro-pack': { label: 'Pro Pack', description: 'Créditos extras para projetos maiores' },
  'mega': { label: 'Mega', description: 'Volume alto para produção intensa' },
  'ultra': { label: 'Ultra', description: 'Quase um plano!' },
};

export function getBoostMetaKey(pkg: CreditPackage): BoostMetaKey | null {
  switch (pkg.credits) {
    case 550: return 'mini';
    case 1700: return 'plus';
    case 3200: return 'pro-pack';
    case 6500: return 'mega';
    case 14000: return 'ultra';
    default: return null;
  }
}

/** @deprecated Use `getBoostMetaKey` + translations instead. */
export function getBoostMeta(pkg: CreditPackage): BoostMeta {
  const key = getBoostMetaKey(pkg);
  if (key) return BOOST_META[key];
  return { label: pkg.name, description: '' };
}

/** @deprecated Use `formatCurrency(cents, currency, locale)` instead. */
export function formatBoostPrice(priceCents: number): string;
export function formatBoostPrice(priceCents: number, currency: string, locale: string): string;
export function formatBoostPrice(
  priceCents: number,
  currency = 'BRL',
  locale = 'pt-BR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function formatCurrency(priceCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

/** @deprecated Use locale-aware translated perks in the component. */
export function getPackagePerks(pkg: CreditPackage): string[] {
  return [
    `${pkg.credits.toLocaleString('pt-BR')} créditos`,
    'Créditos entram na hora',
    'Acumulam com os do plano',
  ];
}

export function getPackageBadge(
  index: number,
  total: number,
): 'popular' | 'best' | null {
  if (total <= 1) return null;
  if (total === 2) return index === 1 ? 'best' : null;
  if (index === Math.floor(total / 2)) return 'popular';
  if (index === total - 1) return 'best';
  return null;
}

/* ── Discount / anchor pricing ── */

export const PLAN_ORIGINAL_PRICES: Record<string, number> = {
  'ultra-basic': 1590,
  starter: 6900,
  basic: 7990,
  creator: 14900,
  pro: 29900,
  advanced: 35690,
  studio: 69900,
};

export const PLAN_DISCOUNT_LABELS: Record<string, string> = {
  'ultra-basic': '19% OFF',
  starter: '29% OFF',
  basic: '25% OFF',
  creator: '33% OFF',
  pro: '33% OFF',
  advanced: '30% OFF',
  studio: '28% OFF',
};

export const PLAN_SOCIAL_PROOF_ICONS: Record<string, LucideIcon> = {
  'ultra-basic': Sprout,
  starter: Users,
  basic: TrendingUp,
  creator: Flame,
  pro: Zap,
  advanced: Crown,
  studio: Trophy,
};

/** @deprecated Use `PLAN_SOCIAL_PROOF_ICONS` + `plans.socialProof.<slug>`. */
export const PLAN_SOCIAL_PROOF: Record<string, { icon: LucideIcon; text: string }> = {
  'ultra-basic': { icon: Sprout, text: 'Dê o primeiro passo' },
  starter: { icon: Users, text: 'Ideal para projetos pessoais' },
  basic: { icon: TrendingUp, text: 'Para quem está crescendo' },
  creator: { icon: Flame, text: 'Escolha de 68% dos criadores' },
  pro: { icon: Zap, text: 'Para quem leva a sério' },
  advanced: { icon: Crown, text: 'Poder e controle total' },
  studio: { icon: Trophy, text: 'Para equipes e agências' },
};

/* ── Price formatting ── */

const FREE_LABEL: Record<string, string> = {
  'pt-BR': 'Grátis',
  en: 'Free',
};

const PER_MONTH: Record<string, string> = {
  'pt-BR': '/mês',
  en: '/mo',
};

/** @deprecated Prefer `formatPlanPrice(plan, locale, t)` — pass translated free/per-month labels. */
export function formatPrice(
  priceCents: number,
  currency = 'BRL',
  locale = 'pt-BR',
): { main: string; sub: string | null } {
  if (priceCents === 0) return { main: FREE_LABEL[locale] ?? 'Free', sub: null };
  const main = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
  return { main, sub: PER_MONTH[locale] ?? '/mo' };
}

export function formatPriceRaw(
  priceCents: number,
  currency = 'BRL',
  locale = 'pt-BR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

export interface PlanFeatureEntry {
  key: string;
  values?: Record<string, string | number>;
}

/**
 * Returns a list of i18n keys (+ ICU values) that callers resolve with
 * `useTranslations('editorPlans')` under `features.*`.
 */
export function getPlanFeatureKeys(plan: Plan): PlanFeatureEntry[] {
  const features: PlanFeatureEntry[] = [];

  if (plan.slug === 'free') {
    features.push({ key: 'features.credits', values: { count: 350 } });
    features.push({ key: 'features.emailSupport' });
    features.push({ key: 'features.gallery7' });
    features.push({ key: 'features.tryNoCommit' });
    features.push({ key: 'features.noVoiceCloning' });
    return features;
  }

  features.push({ key: 'features.credits', values: { count: plan.creditsPerMonth } });

  if (plan.slug === 'pro' || plan.slug === 'studio' || plan.slug === 'advanced') {
    features.push({ key: 'features.queuePriority' });
    features.push({ key: 'features.fasterGenerations' });
    features.push({ key: 'features.prioritySupport' });
    features.push({ key: 'features.gallery365' });
  } else if (plan.slug === 'creator' || plan.slug === 'basic') {
    features.push({ key: 'features.fasterGenerations' });
    features.push({ key: 'features.emailSupport' });
    features.push({ key: 'features.gallery180' });
  } else {
    features.push({ key: 'features.emailSupport' });
    features.push({ key: 'features.gallery90' });
  }

  features.push({ key: 'features.freeVideoGenerations' });

  return features;
}

/**
 * @deprecated Use `getPlanFeatureKeys` together with next-intl in components.
 * Kept for `app/creditos/page.tsx` (non-scope) — returns PT strings.
 */
export function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];

  if (plan.slug === 'free') {
    features.push('350 créditos');
    features.push('Suporte por e-mail');
    features.push('7 dias de galeria');
    features.push('Teste sem compromisso');
    return features;
  }

  features.push(`${plan.creditsPerMonth.toLocaleString('pt-BR')} créditos`);

  if (plan.slug === 'pro' || plan.slug === 'studio' || plan.slug === 'advanced') {
    features.push('Prioridade na fila de gerações');
    features.push('Velocidade maior nas gerações');
    features.push('Suporte prioritário');
    features.push('365 dias de galeria');
  } else if (plan.slug === 'creator' || plan.slug === 'basic') {
    features.push('Velocidade maior nas gerações');
    features.push('Suporte por e-mail');
    features.push('180 dias de galeria');
  } else {
    features.push('Suporte por e-mail');
    features.push('90 dias de galeria');
  }

  return features;
}
