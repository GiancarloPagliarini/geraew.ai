import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdminFeedback } from './api';
import type { CountItem } from './feedback-analytics';

/** Rótulo usado quando o usuário não tem plano ativo (feedback só vem de
 * assinantes pagantes, então "sem plano" = ex-assinante). */
export const NO_PLAN_LABEL = 'ex-Assinantes';

export const GOAL_LABELS: Record<string, string> = {
  'tiktok-shop': 'TikTok Shop',
  canal: 'Canal próprio',
  ads: 'Anúncios',
  agencia: 'Agência/UGC',
  outro: 'Outro',
};

export const FEATURE_LABELS: Record<string, string> = {
  imagens: 'Imagens',
  videos: 'Vídeos',
  movimento: 'Movimento',
  'face-swap': 'Face Swap',
  'try-on': 'Try On',
  upscale: 'Upscale',
  'ranking-tiktok': 'Ranking TikTok',
  prompts: 'Prompts',
};

export type NpsCategory = 'promoter' | 'passive' | 'detractor';

export function npsCategory(nps: number): NpsCategory {
  if (nps >= 9) return 'promoter';
  if (nps >= 7) return 'passive';
  return 'detractor';
}

export const NPS_CATEGORY_LABELS: Record<NpsCategory, string> = {
  promoter: 'Promotores (9–10)',
  passive: 'Neutros (7–8)',
  detractor: 'Detratores (0–6)',
};

export function goalLabel(goal: string, goalOther: string | null) {
  const base = GOAL_LABELS[goal] ?? goal;
  return goal === 'outro' && goalOther ? `${base}: ${goalOther}` : base;
}

export function featureLabel(feature: string) {
  return FEATURE_LABELS[feature] ?? feature;
}

export interface FilteredStats {
  total: number;
  avgNps: number | null;
  avgRating: number | null;
  npsScore: number | null;
  promoters: number;
  passives: number;
  detractors: number;
}

export function computeFilteredStats(items: AdminFeedback[]): FilteredStats {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      avgNps: null,
      avgRating: null,
      npsScore: null,
      promoters: 0,
      passives: 0,
      detractors: 0,
    };
  }
  let npsSum = 0;
  let ratingSum = 0;
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const f of items) {
    npsSum += f.nps;
    ratingSum += f.rating;
    const cat = npsCategory(f.nps);
    if (cat === 'promoter') promoters += 1;
    else if (cat === 'passive') passives += 1;
    else detractors += 1;
  }
  return {
    total,
    avgNps: npsSum / total,
    avgRating: ratingSum / total,
    npsScore: Math.round(((promoters - detractors) / total) * 100),
    promoters,
    passives,
    detractors,
  };
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Brand colors (RGB)
const LIME: [number, number, number] = [162, 221, 0]; // #a2dd00
const DARK: [number, number, number] = [20, 26, 28]; // #141a1c
const MUTED: [number, number, number] = [110, 110, 110];

interface ExportOptions {
  items: AdminFeedback[];
  filtersSummary: string[];
  generatedAt: Date;
}

export function exportFeedbacksPdf({ items, filtersSummary, generatedAt }: ExportOptions) {
  const stats = computeFilteredStats(items);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('Relatório de Feedbacks — GeraEW', marginX, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Gerado em ${generatedAt.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    marginX,
    60,
  );

  // ── Filtros aplicados ──────────────────────────────────────
  const filtersText =
    filtersSummary.length > 0 ? filtersSummary.join('   ·   ') : 'Nenhum filtro aplicado';
  const filtersLines = doc.splitTextToSize(`Filtros: ${filtersText}`, pageWidth - marginX * 2);
  doc.setTextColor(...DARK);
  doc.text(filtersLines, marginX, 76);

  // ── Resumo estatístico ─────────────────────────────────────
  const summaryY = 76 + filtersLines.length * 12 + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Resumo', marginX, summaryY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const summaryParts = [
    `Total: ${stats.total}`,
    `NPS médio: ${stats.avgNps !== null ? stats.avgNps.toFixed(1) : '—'}`,
    `NPS Score: ${stats.npsScore !== null ? stats.npsScore : '—'}`,
    `Rating médio: ${stats.avgRating !== null ? stats.avgRating.toFixed(1) : '—'}`,
    `Promotores: ${stats.promoters}`,
    `Neutros: ${stats.passives}`,
    `Detratores: ${stats.detractors}`,
  ];
  const summaryLines = doc.splitTextToSize(summaryParts.join('   ·   '), pageWidth - marginX * 2);
  doc.text(summaryLines, marginX, summaryY + 14);

  const tableStartY = summaryY + 14 + summaryLines.length * 12 + 10;

  if (items.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('Nenhum feedback corresponde aos filtros selecionados.', marginX, tableStartY);
    doc.save(buildFilename(generatedAt));
    return;
  }

  // ── Tabela 1: Visão geral ──────────────────────────────────
  autoTable(doc, {
    startY: tableStartY,
    head: [['Data', 'Usuário', 'Plano', 'NPS', 'Rating', 'Objetivo', 'Funcionalidades']],
    body: items.map((f) => [
      formatDateLong(f.createdAt),
      `${f.user.name || '—'}\n${f.user.email}`,
      f.user.plan?.name ?? NO_PLAN_LABEL,
      String(f.nps),
      `${f.rating}/5`,
      goalLabel(f.goal, f.goalOther),
      f.features.map(featureLabel).join(', ') || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: 'top', textColor: DARK },
    headStyles: { fillColor: LIME, textColor: DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 150 },
      2: { cellWidth: 60 },
      3: { cellWidth: 34, halign: 'center' },
      4: { cellWidth: 42, halign: 'center' },
      5: { cellWidth: 110 },
    },
    margin: { left: marginX, right: marginX },
  });

  // ── Tabela 2: Respostas abertas ────────────────────────────
  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text('Respostas abertas', marginX, 44);

  autoTable(doc, {
    startY: 58,
    head: [['Usuário', 'O que impressionou', 'O que melhorar', 'Wishlist']],
    body: items.map((f) => [
      `${f.user.name || f.user.email}`,
      f.highlight || '—',
      f.improve || '—',
      f.wishlist || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: 'top', textColor: DARK },
    headStyles: { fillColor: LIME, textColor: DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 246] },
    columnStyles: {
      0: { cellWidth: 110 },
    },
    margin: { left: marginX, right: marginX },
  });

  // ── Rodapé com paginação ───────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`GeraEW · Relatório de Feedbacks`, marginX, h - 18);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, h - 18, { align: 'right' });
  }

  doc.save(buildFilename(generatedAt));
}

function buildFilename(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `feedbacks-geraew-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.pdf`;
}

// Layout (A4 retrato, em pt) da área usada para anexar a captura visual do
// dashboard. Exportado para o fatiamento da imagem (no client) bater com a
// área de desenho aqui. A4: 595.28 x 841.89 pt.
export const DASHBOARD_CAPTURE = {
  marginX: 40,
  top: 56,
  bottom: 30,
  contentW: 595.28 - 40 * 2,
  contentH: 841.89 - 56 - 30,
};

export interface DashboardImagePage {
  dataUrl: string;
  wPx: number;
  hPx: number;
}

interface DashboardExportOptions {
  generatedAt: Date;
  filtersSummary: string[];
  stats: FilteredStats;
  goals: CountItem[];
  features: CountItem[];
  plans: CountItem[];
  ratings: { rating: number; value: number }[];
  nps: { key: string; label: string; value: number }[];
  series: { label: string; value: number }[];
  /** Páginas da captura visual do dashboard (já fatiadas no aspect da A4). */
  dashboardPages?: DashboardImagePage[];
}

export function exportDashboardPdf({
  generatedAt,
  filtersSummary,
  stats,
  goals,
  features,
  plans,
  ratings,
  nps,
  series,
  dashboardPages,
}: DashboardExportOptions) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  let y = 44;

  const pct = (v: number) => (stats.total ? Math.round((v / stats.total) * 100) : 0);

  // ── Cabeçalho ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('Dashboard de Feedbacks — GeraEW', marginX, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Gerado em ${generatedAt.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    marginX,
    y,
  );
  y += 14;

  const filtersText =
    filtersSummary.length > 0 ? filtersSummary.join('   ·   ') : 'Nenhum filtro aplicado';
  const filtersLines = doc.splitTextToSize(`Filtros: ${filtersText}`, pageWidth - marginX * 2);
  doc.setTextColor(...DARK);
  doc.text(filtersLines, marginX, y);
  y += filtersLines.length * 12 + 8;

  // ── Resumo / insights ──────────────────────────────────────
  const topGoal = goals[0];
  const topFeature = features[0];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Resumo', marginX, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const summaryParts = [
    `Total: ${stats.total}`,
    `NPS Score: ${stats.npsScore !== null ? stats.npsScore : '—'}`,
    `NPS médio: ${stats.avgNps !== null ? stats.avgNps.toFixed(1) : '—'}`,
    `Rating médio: ${stats.avgRating !== null ? stats.avgRating.toFixed(1) : '—'}`,
    `Objetivo nº1: ${topGoal ? `${topGoal.label} (${topGoal.pct}%)` : '—'}`,
    `Funcionalidade nº1: ${topFeature ? `${topFeature.label} (${topFeature.pct}%)` : '—'}`,
  ];
  const summaryLines = doc.splitTextToSize(summaryParts.join('   ·   '), pageWidth - marginX * 2);
  doc.text(summaryLines, marginX, y);
  y += summaryLines.length * 12 + 12;

  const finalY = () =>
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;

  const section = (title: string) => {
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 44;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(title, marginX, y);
    y += 8;
  };

  const distTable = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      styles: { fontSize: 9, cellPadding: 4, textColor: DARK },
      headStyles: { fillColor: LIME, textColor: DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 246] },
      columnStyles: { 1: { halign: 'center', cellWidth: 90 }, 2: { halign: 'center', cellWidth: 70 } },
      margin: { left: marginX, right: marginX },
    });
    y = finalY() + 18;
  };

  // ── Objetivos ──────────────────────────────────────────────
  section('Objetivo dos usuários');
  distTable(
    ['Objetivo', 'Feedbacks', '%'],
    goals.length ? goals.map((g) => [g.label, g.value, `${g.pct}%`]) : [['—', 0, '0%']],
  );

  // ── Funcionalidades ────────────────────────────────────────
  section('Funcionalidades mais citadas');
  distTable(
    ['Funcionalidade', 'Menções', '% dos feedbacks'],
    features.length ? features.map((f) => [f.label, f.value, `${f.pct}%`]) : [['—', 0, '0%']],
  );

  // ── NPS ────────────────────────────────────────────────────
  section('Distribuição de NPS');
  distTable(
    ['Categoria', 'Feedbacks', '%'],
    nps.map((n) => [n.label, n.value, `${pct(n.value)}%`]),
  );

  // ── Rating ─────────────────────────────────────────────────
  section('Distribuição de rating');
  distTable(
    ['Nota', 'Feedbacks', '%'],
    ratings.map((r) => [`${r.rating} estrela(s)`, r.value, `${pct(r.value)}%`]),
  );

  // ── Planos ─────────────────────────────────────────────────
  section('Feedbacks por plano');
  distTable(
    ['Plano', 'Feedbacks', '%'],
    plans.length ? plans.map((p) => [p.label, p.value, `${p.pct}%`]) : [['—', 0, '0%']],
  );

  // ── Evolução no tempo ──────────────────────────────────────
  if (series.length > 0) {
    section('Feedbacks ao longo do tempo');
    distTable(
      ['Data', 'Feedbacks', '%'],
      series.map((s) => [s.label, s.value, `${pct(s.value)}%`]),
    );
  }

  // ── Captura visual do dashboard ────────────────────────────
  if (dashboardPages && dashboardPages.length > 0) {
    const imgW = DASHBOARD_CAPTURE.contentW;
    dashboardPages.forEach((pg, idx) => {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      const title =
        dashboardPages.length > 1
          ? `Dashboard — visão visual (${idx + 1}/${dashboardPages.length})`
          : 'Dashboard — visão visual';
      doc.text(title, DASHBOARD_CAPTURE.marginX, 40);
      const imgH = (imgW * pg.hPx) / pg.wPx;
      doc.addImage(pg.dataUrl, 'PNG', DASHBOARD_CAPTURE.marginX, DASHBOARD_CAPTURE.top, imgW, imgH, undefined, 'FAST');
    });
  }

  // ── Rodapé ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('GeraEW · Dashboard de Feedbacks', marginX, pageHeight - 18);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 18, {
      align: 'right',
    });
  }

  doc.save(`dashboard-feedbacks-geraew-${generatedAt.getFullYear()}-${String(
    generatedAt.getMonth() + 1,
  ).padStart(2, '0')}-${String(generatedAt.getDate()).padStart(2, '0')}.pdf`);
}
