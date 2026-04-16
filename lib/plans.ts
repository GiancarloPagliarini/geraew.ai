import type { Plan, CreditPackage } from './api';
import type { LucideIcon } from 'lucide-react';
import { Flame, Zap, Trophy, Users, TestTubeDiagonal, Sprout, TrendingUp, Crown } from 'lucide-react';

export const PLAN_ORDER = ['free', 'ultra-basic', 'starter', 'basic', 'creator', 'pro', 'advanced', 'studio'];

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

export type GenerationUnit = 'image' | 'generation' | 'video';

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
    { label: 'Geraew Fast', countNumber: 2, unit: 'video' },
    { label: 'Geraew Quality', countNumber: 2, unit: 'video' },
    { label: 'Veo 3.1', countNumber: 0, unit: 'video', blocked: true },
  ],
  starter: [
    { label: 'Nano Banana 2', countNumber: 44, unit: 'image' },
    { label: 'Motion Control', countNumber: 5, unit: 'generation' },
    { label: 'Geraew Fast', countNumber: 4, unit: 'video' },
    { label: 'Geraew Quality', countNumber: 2, unit: 'video' },
    { label: 'Veo 3.1 Fast', countNumber: 3, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 1, unit: 'video' },
  ],
  creator: [
    { label: 'Nano Banana 2', countNumber: 133, unit: 'image' },
    { label: 'Motion Control', countNumber: 17, unit: 'generation' },
    { label: 'Geraew Fast', countNumber: 13, unit: 'video' },
    { label: 'Geraew Quality', countNumber: 6, unit: 'video' },
    { label: 'Veo 3.1 Fast', countNumber: 9, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 4, unit: 'video' },
  ],
  pro: [
    { label: 'Nano Banana 2', countNumber: 333, unit: 'image' },
    { label: 'Motion Control', countNumber: 42, unit: 'generation' },
    { label: 'Geraew Fast', countNumber: 33, unit: 'video' },
    { label: 'Geraew Quality', countNumber: 15, unit: 'video' },
    { label: 'Veo 3.1 Fast', countNumber: 23, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 10, unit: 'video' },
  ],
  studio: [
    { label: 'Nano Banana 2', countNumber: 888, unit: 'image' },
    { label: 'Motion Control', countNumber: 114, unit: 'generation' },
    { label: 'Geraew Fast', countNumber: 88, unit: 'video' },
    { label: 'Geraew Quality', countNumber: 40, unit: 'video' },
    { label: 'Veo 3.1 Fast', countNumber: 61, unit: 'video' },
    { label: 'Veo 3.1 Quality', countNumber: 27, unit: 'video' },
  ],
};

/**
 * @deprecated Use `PLAN_GENERATION_ENTRIES` + translations instead.
 * Retained for backward compatibility.
 */
export const PLAN_GENERATIONS: Record<string, PlanGenerationExample[]> = {
  free: [
    { label: 'Nano Banana 2', count: '3 Imagens' },
    { label: 'Motion Control', count: '1 Geração' },
    { label: 'Geraew Fast', count: '2 Vídeos Grátis' },
    { label: 'Geraew Quality', count: '2 Vídeos Grátis' },
    { label: 'Veo 3.1', count: 'Bloqueado', blocked: true },
  ],
  starter: [
    { label: 'Nano Banana 2', count: '44 Imagens' },
    { label: 'Motion Control', count: '5 Gerações' },
    { label: 'Geraew Fast', count: '4 Vídeos' },
    { label: 'Geraew Quality', count: '2 Vídeos' },
    { label: 'Veo 3.1 Fast', count: '3 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '1 Vídeo' },
  ],
  creator: [
    { label: 'Nano Banana 2', count: '133 Imagens' },
    { label: 'Motion Control', count: '17 Gerações' },
    { label: 'Geraew Fast', count: '13 Vídeos' },
    { label: 'Geraew Quality', count: '6 Vídeos' },
    { label: 'Veo 3.1 Fast', count: '9 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '4 Vídeos' },
  ],
  pro: [
    { label: 'Nano Banana 2', count: '333 Imagens' },
    { label: 'Motion Control', count: '42 Gerações' },
    { label: 'Geraew Fast', count: '33 Vídeos' },
    { label: 'Geraew Quality', count: '15 Vídeos' },
    { label: 'Veo 3.1 Fast', count: '23 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '10 Vídeos' },
  ],
  studio: [
    { label: 'Nano Banana 2', count: '888 Imagens' },
    { label: 'Motion Control', count: '114 Gerações' },
    { label: 'Geraew Fast', count: '88 Vídeos' },
    { label: 'Geraew Quality', count: '40 Vídeos' },
    { label: 'Veo 3.1 Fast', count: '61 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '27 Vídeos' },
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
