'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Gift, Clock, Crown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useEditor } from '@/lib/editor-context';
import { PlansModal } from './PlansModal';
import { WeeklyClaimModal } from './WeeklyClaimModal';

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

export function WeeklyClaimWidget() {
  const t = useTranslations('editorRewards.weeklyWidget');
  const { user, accessToken } = useAuth();
  const { weeklyClaimRequest } = useEditor();
  const [now, setNow] = useState(() => Date.now());
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  // Permite que o announcement (e qualquer outro lugar) abra o modal via context.
  useEffect(() => {
    if (weeklyClaimRequest > 0) setClaimModalOpen(true);
  }, [weeklyClaimRequest]);

  const { data: status, isLoading } = useQuery({
    queryKey: ['rewards', 'weeklyClaim'],
    queryFn: () => api.rewards.weeklyClaimStatus(accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = useMemo(() => {
    if (!status) return null;
    if (status.canClaim) return null;
    return new Date(status.nextWindowOpensAt).getTime();
  }, [status]);

  if (isLoading || !status) {
    return (
      <div className="hidden h-7 w-28 animate-pulse rounded-full bg-[#f3f0ed]/[0.06] sm:block" />
    );
  }

  const countdown = targetMs !== null ? formatCountdown(targetMs - now) : null;
  const showClaimButton = status.canClaim;
  const isLocked = !status.isPaying;

  const countdownLabel = countdown
    ? countdown.d > 0
      ? `${countdown.d}d ${countdown.h}h`
      : `${String(countdown.h).padStart(2, '0')}:${String(countdown.m).padStart(2, '0')}:${String(countdown.s).padStart(2, '0')}`
    : '—';

  return (
    <>
      <button
        onClick={() => setClaimModalOpen(true)}
        className={`group relative hidden items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-xs font-semibold transition-all sm:flex ${isLocked
          ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300 hover:border-yellow-400/70 hover:bg-yellow-400/15'
          : showClaimButton
            ? 'border-[#a2dd00]/50 bg-[#a2dd00]/15 text-[#a2dd00] hover:border-[#a2dd00]/80 hover:bg-[#a2dd00]/20'
            : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-[#f3f0ed]/60 hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed]/80'
          }`}
      >
        {/* Radial glow background — claim state only */}
        {showClaimButton && (
          <span className="pointer-events-none absolute -inset-x-6 -inset-y-2 bg-[radial-gradient(ellipse_at_center,rgba(162,221,0,0.35),transparent_70%)] opacity-70 blur-md transition-opacity group-hover:opacity-100" />
        )}

        {/* Pulsing dot — claim state only */}
        {showClaimButton && (
          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-[#a2dd00]/60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
          </span>
        )}

        <div className="relative shrink-0">
          {isLocked ? (
            <Crown className="h-3.5 w-3.5" />
          ) : showClaimButton ? (
            <Gift className="h-3.5 w-3.5" />
          ) : (
            <Clock className="h-3.5 w-3.5" />
          )}
        </div>

        <span className="relative whitespace-nowrap tabular-nums">
          {isLocked
            ? t('premiumLocked')
            : showClaimButton
              ? t('claim')
              : t('countdown', { countdown: countdownLabel })}
        </span>
      </button>

      {claimModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <WeeklyClaimModal
            onClose={() => setClaimModalOpen(false)}
            onRequireUpgrade={() => {
              setClaimModalOpen(false);
              setPlansModalOpen(true);
            }}
          />,
          document.body,
        )}

      {plansModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(<PlansModal onClose={() => setPlansModalOpen(false)} />, document.body)}
    </>
  );
}
