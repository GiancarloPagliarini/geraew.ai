import type { Plan, CreditPackage } from './api';

export const PLAN_ORDER = ['free', 'starter', 'creator', 'pro', 'studio'];

export const PLAN_SUBTITLES: Record<string, string> = {
  starter: 'Explorador',
  creator: 'Criador',
  pro: 'Produtor',
  studio: 'Profissional',
};

export interface PlanGenerationExample {
  label: string;
  count: string;
  blocked?: boolean;
}

export const PLAN_GENERATIONS: Record<string, PlanGenerationExample[]> = {
  free: [
    { label: 'Nano Banana 2', count: '3 Imagens' },
    { label: 'Motion Control', count: '1 Geração' },
    { label: 'Veo 3.1 Fast', count: '2 Vídeos Grátis' },
    { label: 'Veo 3.1 Quality', count: '2 Vídeos Grátis' },
  ],
  starter: [
    { label: 'Nano Banana 2', count: '44 Imagens' },
    { label: 'Motion Control', count: '5 Gerações' },
    { label: 'Veo 3.1 Fast', count: '6 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '4 Vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '1 Vídeo' },
  ],
  creator: [
    { label: 'Nano Banana 2', count: '133 Imagens' },
    { label: 'Motion Control', count: '17 Gerações' },
    { label: 'Veo 3.1 Fast', count: '20 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '12 Vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '4 Vídeos' },
  ],
  pro: [
    { label: 'Nano Banana 2', count: '333 Imagens' },
    { label: 'Motion Control', count: '42 Gerações' },
    { label: 'Veo 3.1 Fast', count: '50 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '30 Vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '10 Vídeos' },
  ],
  studio: [
    { label: 'Nano Banana 2', count: '888 Imagens' },
    { label: 'Motion Control', count: '114 Gerações' },
    { label: 'Veo 3.1 Fast', count: '133 Vídeos' },
    { label: 'Veo 3.1 Quality', count: '80 Vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '28 Vídeos' },
  ],
};

/* ── Boost packages ── */

export interface BoostMeta {
  label: string;
  description: string;
}

export const BOOST_META: Record<string, BoostMeta> = {
  'boost-p': { label: 'Emergência', description: 'Recarrega rápida para continuar gerando' },
  'boost-m': { label: 'Fôlego', description: 'Créditos extras para projetos maiores' },
  'boost-g': { label: 'Pré-upgrade', description: 'Quase um plano — ideal para testar' },
};

export function getBoostMeta(pkg: CreditPackage): BoostMeta {
  const key = pkg.name.toLowerCase().replace(/\s+/g, '-');
  return (
    BOOST_META[key] ??
    BOOST_META[`boost-${pkg.name.toLowerCase().charAt(pkg.name.length - 1)}`] ??
    { label: pkg.name, description: '' }
  );
}

export function formatBoostPrice(priceCents: number) {
  const value = priceCents / 100;
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}

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
  starter: 6900,
  creator: 14900,
  pro: 29900,
  studio: 69900,
};

export const PLAN_DISCOUNT_LABELS: Record<string, string> = {
  starter: '29% OFF',
  creator: '33% OFF',
  pro: '33% OFF',
  studio: '28% OFF',
};

export const PLAN_SOCIAL_PROOF: Record<string, string> = {
  creator: '🔥 Escolha de 68% dos criadores',
  pro: '⚡ Para quem leva a sério',
  studio: '🏆 Para equipes e agências',
};

/* ── Price formatting ── */

export function formatPrice(priceCents: number) {
  if (priceCents === 0) return { main: 'Grátis', sub: null };
  const int = Math.floor(priceCents / 100);
  const cents = String(priceCents % 100).padStart(2, '0');
  return { main: `R$ ${int.toLocaleString('pt-BR')},${cents}`, sub: '/mês' };
}

export function formatPriceRaw(priceCents: number) {
  const int = Math.floor(priceCents / 100);
  const cents = String(priceCents % 100).padStart(2, '0');
  return `R$ ${int.toLocaleString('pt-BR')},${cents}`;
}

export function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];

  if (plan.slug === 'free') {
    features.push('350 créditos');
    features.push('Suporte por e-mail');
    features.push('7 dias de galeria');
    return features;
  }

  features.push(`${plan.creditsPerMonth.toLocaleString('pt-BR')} créditos`);

  if (plan.slug === 'pro' || plan.slug === 'studio') {
    features.push('Prioridade na fila de gerações');
    features.push('Velocidade maior nas gerações');
    features.push('Suporte prioritário');
    features.push('365 dias de galeria');
  } else if (plan.slug === 'creator') {
    features.push('Velocidade maior nas gerações');
    features.push('Suporte por e-mail');
    features.push('180 dias de galeria');
  } else {
    features.push('Suporte por e-mail');
    features.push('90 dias de galeria');
  }

  return features;
}
