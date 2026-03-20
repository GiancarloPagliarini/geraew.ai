'use client';

import { AlertCircle, Coins, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

// ─── Toast helper ─────────────────────────────────────────────────────────────

interface ShowGenerationErrorParams {
  errorMessage?: string | null;
  creditsRefunded?: number;
  fallback?: string;
}

/**
 * Fires a Sonner toast with a rich error message and returns the formatted
 * string to store in the panel's `errorMsg` state.
 */
export function showGenerationError({
  errorMessage,
  creditsRefunded = 0,
  fallback = 'Erro ao gerar.',
}: ShowGenerationErrorParams): string {
  const msg = errorMessage ?? fallback;
  const n = creditsRefunded ?? 0;

  toast.error(msg, {
    description:
      n > 0
        ? `${n} crédito${n !== 1 ? 's' : ''} estornado${n !== 1 ? 's' : ''} para sua conta.`
        : 'Tente novamente em instantes.',
    duration: 7000,
  });

  return n > 0
    ? `${msg} (${n} crédito${n !== 1 ? 's' : ''} estornado${n !== 1 ? 's' : ''})`
    : msg;
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
                {credits} crédito{credits !== 1 ? 's' : ''} estornado{credits !== 1 ? 's' : ''} para sua conta
              </span>
            </div>
          ) : (
            <span className="text-[11px] leading-none text-white/30">
              Nenhum crédito foi descontado. Tente novamente em instantes.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
