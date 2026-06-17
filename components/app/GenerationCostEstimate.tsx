'use client';

import { useTranslations } from 'next-intl';
import { Coins, Infinity as InfinityIcon } from 'lucide-react';

interface GenerationCostEstimateProps {
  /** créditos por geração (vindo do endpoint /credits/estimate) */
  credits: number | null | undefined;
  loading?: boolean;
  /** geração grátis disponível para esse tipo */
  free?: boolean;
  /** gerações grátis restantes (mostrado no hint quando free) */
  freeRemaining?: number | null;
  /** multiplicador de quantidade (ex.: gerar 3 imagens) — total = credits × count */
  count?: number;
  /** modo ilimitado ativo — geração não consome créditos */
  unlimited?: boolean;
}

/**
 * Card de estimativa de custo por geração, no padrão do painel de vídeo de avatar.
 * Compartilhado entre os painéis de imagem e vídeo do shell.
 */
export function GenerationCostEstimate({
  credits,
  loading = false,
  free = false,
  freeRemaining,
  count = 1,
  unlimited = false,
}: GenerationCostEstimateProps) {
  const t = useTranslations('home.cost');

  const total = typeof credits === 'number' ? credits * Math.max(1, count) : null;

  // modo ilimitado — destaque violeta, sem consumo de créditos
  if (unlimited) {
    return (
      <div className="rounded-xl border border-[#a855f7]/30 bg-[#a855f7]/[0.07] px-3.5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <InfinityIcon className="size-3.5 text-[#a855f7]" strokeWidth={2} />
            <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-[#a855f7]/70">
              {t('label')}
            </span>
          </div>
          <span className="text-[13px] font-bold text-[#a855f7]">{t('unlimited')}</span>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#a855f7]/55">{t('unlimitedHint')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app-hairline bg-app-surface px-3.5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Coins className="size-3.5 text-app-lime" strokeWidth={1.8} />
          <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
            {t('label')}
          </span>
        </div>
        {loading || total === null ? (
          <span className="text-[13px] font-semibold text-app-muted">{t('calculating')}</span>
        ) : free ? (
          <span className="text-[13px] font-bold text-app-lime">{t('free')}</span>
        ) : (
          <span className="text-[13px] font-bold text-app-text">
            {t('credits', { credits: total.toLocaleString() })}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-app-muted">
        {free && typeof freeRemaining === 'number'
          ? t('freeHint', { remaining: freeRemaining })
          : count > 1
            ? t('hintMultiple', { count })
            : t('hintSingle')}
      </p>
    </div>
  );
}
