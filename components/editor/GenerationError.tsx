'use client';

import { AlertCircle, Coins, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

// ─── Toast helper ─────────────────────────────────────────────────────────────

interface ShowGenerationErrorParams {
  errorMessage?: string | null;
  creditsRefunded?: number;
  fallback?: string;
  /**
   * Optional i18n strings. When provided, these override defaults.
   * - refundedDescription: used as toast description when credits were refunded. `{count}` is replaced.
   * - tryAgain: used as toast description when no refund.
   * - refundedSuffix: appended to the returned message when credits were refunded. `{count}` is replaced.
   */
  strings?: {
    refundedDescription?: string;
    tryAgain?: string;
    refundedSuffix?: string;
  };
}

function interpolate(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count));
}

/**
 * Fires a Sonner toast with a rich error message and returns the formatted
 * string to store in the panel's `errorMsg` state.
 */
export function showGenerationError({
  errorMessage,
  creditsRefunded = 0,
  fallback = 'Erro ao gerar.',
  strings,
}: ShowGenerationErrorParams): string {
  const msg = errorMessage ?? fallback;
  const n = creditsRefunded ?? 0;

  const refundedDescTpl =
    strings?.refundedDescription ??
    `${n} crédito${n !== 1 ? 's' : ''} estornado${n !== 1 ? 's' : ''} para sua conta.`;
  const tryAgainText = strings?.tryAgain ?? 'Tente novamente em instantes.';
  const refundedSuffixTpl =
    strings?.refundedSuffix ??
    `(${n} crédito${n !== 1 ? 's' : ''} estornado${n !== 1 ? 's' : ''})`;

  toast.error(msg, {
    description: n > 0 ? interpolate(refundedDescTpl, n) : tryAgainText,
    duration: 7000,
  });

  return n > 0 ? `${msg} ${interpolate(refundedSuffixTpl, n)}` : msg;
}

// ─── Inline banner ────────────────────────────────────────────────────────────

const CREDITS_RE = /^(.*?)\s*\((\d+) créditos? estornados?\)$/;

function parseMsg(msg: string) {
  const m = msg.match(CREDITS_RE);
  if (m) return { text: m[1], credits: parseInt(m[2], 10) };
  return { text: msg, credits: 0 };
}

interface GenerationErrorBannerProps {
  msg: string | null;
}

/**
 * Inline error banner shown inside the panel node.
 * Automatically parses and highlights the credits-refunded info when present.
 */
export function GenerationErrorBanner({ msg }: GenerationErrorBannerProps) {
  const t = useTranslations('editor.generationError');
  if (!msg) return null;

  const { text, credits } = parseMsg(msg);

  return (
    <div className="relative overflow-hidden rounded-lg border border-red-500/15 bg-linear-to-br from-red-500/9 to-red-500/4">
      {/* Left accent bar */}
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg bg-linear-to-b from-red-400/70 to-red-600/40" />

      <div className="flex items-start gap-2.5 py-2.5 pl-4 pr-3.5">
        {/* Icon */}
        <div className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-red-500/20">
          <AlertCircle className="h-3 w-3 text-red-400" />
        </div>

        {/* Text */}
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-medium leading-snug text-red-300/90">{text}</span>

          {credits > 0 ? (
            <div className="flex items-center gap-1.5">
              <Coins className="h-3 w-3 shrink-0 text-[#a2dd00]/60" />
              <span className="text-[11px] font-semibold leading-none text-[#a2dd00]/60">
                {t('refundedBanner', { count: credits })}
              </span>
            </div>
          ) : (
            <span className="text-[11px] leading-none text-white/30">
              {t('noDeduction')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
