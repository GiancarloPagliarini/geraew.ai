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
    { label: 'Nano Banana 2', count: '3 imgs/dia' },
    { label: 'Motion Control', count: '4 clips/dia' },
    { label: 'Veo 3.1 Fast', count: 'bloqueado', blocked: true },
    { label: 'Veo 3.1 Quality', count: 'bloqueado', blocked: true },
  ],
  starter: [
    { label: 'Nano Banana 2', count: '44 imgs' },
    { label: 'Motion Control', count: '57 clips' },
    { label: 'Veo 3.1 Fast', count: '6 vídeos' },
    { label: 'Veo 3.1 Quality', count: '4 vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '1 vídeo' },
  ],
  creator: [
    { label: 'Nano Banana 2', count: '133 imgs' },
    { label: 'Motion Control', count: '171 clips' },
    { label: 'Veo 3.1 Fast', count: '20 vídeos' },
    { label: 'Veo 3.1 Quality', count: '12 vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '4 vídeos' },
  ],
  pro: [
    { label: 'Nano Banana 2', count: '333 imgs' },
    { label: 'Motion Control', count: '428 clips' },
    { label: 'Veo 3.1 Fast', count: '50 vídeos' },
    { label: 'Veo 3.1 Quality', count: '30 vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '10 vídeos' },
  ],
  studio: [
    { label: 'Nano Banana 2', count: '888 imgs' },
    { label: 'Motion Control', count: '1.142 clips' },
    { label: 'Veo 3.1 Fast', count: '133 vídeos' },
    { label: 'Veo 3.1 Quality', count: '80 vídeos' },
    { label: 'Veo 3.1 Quality 4K', count: '28 vídeos' },
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

/* ── Price formatting ── */

export function formatPrice(priceCents: number) {
  if (priceCents === 0) return { main: 'Grátis', sub: null };
  const int = Math.floor(priceCents / 100);
  const cents = String(priceCents % 100).padStart(2, '0');
  return { main: `R$ ${int.toLocaleString('pt-BR')},${cents}`, sub: '/mês' };
}

export function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];

  if (plan.slug === 'free') {
    features.push('30 créditos');
    features.push('Suporte por e-mail');
    features.push('Galeria ilimitada');
    return features;
  }

  features.push(`${plan.creditsPerMonth.toLocaleString('pt-BR')} créditos`);

  if (plan.slug === 'pro' || plan.slug === 'studio') {
    features.push('Prioridade na fila de gerações');
    features.push('Velocidade maior nas gerações');
    features.push('Suporte prioritário');
    features.push('Galeria ilimitada');
  } else if (plan.slug === 'creator') {
    features.push('Velocidade maior nas gerações');
    features.push('Suporte por e-mail');
    features.push('Galeria ilimitada');
  } else {
    features.push('Suporte por e-mail');
    features.push('Galeria ilimitada');
  }

  return features;
}
