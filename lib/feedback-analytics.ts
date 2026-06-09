import type { AdminFeedback } from './api';
import { GOAL_LABELS, FEATURE_LABELS, npsCategory, NO_PLAN_LABEL } from './feedback-pdf';

export interface CountItem {
  key: string;
  label: string;
  value: number;
  pct: number; // 0–100, relativo ao total de feedbacks
}

/** Distribuição por objetivo (um por feedback). */
export function goalDistribution(items: AdminFeedback[]): CountItem[] {
  const total = items.length;
  const counts = new Map<string, number>();
  for (const f of items) {
    counts.set(f.goal, (counts.get(f.goal) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, value]) => ({
      key,
      label: GOAL_LABELS[key] ?? key,
      value,
      pct: total ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Distribuição por funcionalidade (cada feedback pode citar várias). */
export function featureDistribution(items: AdminFeedback[]): CountItem[] {
  const total = items.length;
  const counts = new Map<string, number>();
  for (const f of items) {
    for (const feat of f.features) {
      counts.set(feat, (counts.get(feat) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([key, value]) => ({
      key,
      label: FEATURE_LABELS[key] ?? key,
      value,
      pct: total ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Distribuição por plano. */
export function planDistribution(items: AdminFeedback[]): CountItem[] {
  const total = items.length;
  const counts = new Map<string, { label: string; value: number }>();
  for (const f of items) {
    const key = f.user.plan?.slug ?? 'free';
    const label = f.user.plan?.name ?? NO_PLAN_LABEL;
    const entry = counts.get(key) ?? { label, value: 0 };
    entry.value += 1;
    counts.set(key, entry);
  }
  return Array.from(counts.entries())
    .map(([key, { label, value }]) => ({
      key,
      label,
      value,
      pct: total ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/** Contagem por nota de rating (1–5). */
export function ratingDistribution(items: AdminFeedback[]): { rating: number; value: number }[] {
  const counts = [1, 2, 3, 4, 5].map((rating) => ({ rating, value: 0 }));
  for (const f of items) {
    const idx = Math.min(5, Math.max(1, f.rating)) - 1;
    counts[idx].value += 1;
  }
  return counts;
}

/** Quebra de NPS em promotores / neutros / detratores. */
export function npsBreakdown(items: AdminFeedback[]) {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const f of items) {
    const cat = npsCategory(f.nps);
    if (cat === 'promoter') promoters += 1;
    else if (cat === 'passive') passives += 1;
    else detractors += 1;
  }
  return [
    { key: 'promoter', label: 'Promotores', value: promoters },
    { key: 'passive', label: 'Neutros', value: passives },
    { key: 'detractor', label: 'Detratores', value: detractors },
  ];
}

/** Feedbacks por dia (ordenado crescente). */
export function timeSeries(items: AdminFeedback[]): { date: string; label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const f of items) {
    const d = new Date(f.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => {
      const [, m, day] = date.split('-');
      return { date, label: `${day}/${m}`, value };
    });
}
