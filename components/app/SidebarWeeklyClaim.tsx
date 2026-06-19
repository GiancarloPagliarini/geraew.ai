'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Clock, Crown, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { WeeklyClaimModal } from '@/components/editor/WeeklyClaimModal';
import { PlansModal } from '@/components/editor/PlansModal';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Card do resgate semanal (+4 vídeos toda quarta) no rodapé da sidebar — antes
 * só era possível resgatar no workspace. Reaproveita o WeeklyClaimModal.
 */
export function SidebarWeeklyClaim({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('home.weeklyClaim');
  const { user, accessToken } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [claimOpen, setClaimOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['rewards', 'weeklyClaim'],
    queryFn: () => api.rewards.weeklyClaimStatus(accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const countdown = useMemo(() => {
    if (!status || status.canClaim) return null;
    return formatCountdown(new Date(status.nextWindowOpensAt).getTime() - now);
  }, [status, now]);

  if (!user || !status) return null;

  const canClaim = status.canClaim;
  const isLocked = !status.isPaying;
  const amount = status.amount ?? 4;

  const StateIcon = isLocked ? Crown : canClaim ? Gift : Clock;
  const subtitle = isLocked
    ? t('locked')
    : canClaim
      ? t('available')
      : t('nextIn', { countdown: countdown ?? '—' });

  // recolhido: só o ícone, com pulso quando há resgate disponível
  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setClaimOpen(true)}
              aria-label={t('title')}
              className={cn(
                'relative mx-auto flex size-9 items-center justify-center rounded-xl border transition-colors duration-200 ease-app',
                canClaim
                  ? 'border-[rgba(162,221,0,0.4)] bg-[rgba(162,221,0,0.1)] text-app-lime hover:bg-[rgba(162,221,0,0.16)]'
                  : 'border-app-hairline bg-app-surface text-app-text-2 hover:text-app-text',
              )}
            >
              <StateIcon className="size-[18px]" strokeWidth={1.8} />
              {canClaim && (
                <span className="absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center">
                  <span className="absolute size-full animate-ping rounded-full bg-app-lime/60" />
                  <span className="relative size-1.5 rounded-full bg-app-lime" />
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {t('title')} — {subtitle}
          </TooltipContent>
        </Tooltip>
        {renderModals()}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setClaimOpen(true)}
        className={cn(
          'group relative w-full overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-200 ease-app',
          canClaim
            ? 'border-[rgba(162,221,0,0.32)] bg-[rgba(162,221,0,0.06)] hover:border-[rgba(162,221,0,0.5)]'
            : 'border-app-hairline bg-app-surface/60 hover:border-app-hairline-2',
        )}
      >
        {/* brilho radial — só no estado resgatável */}
        {canClaim && (
          <span className="pointer-events-none absolute -inset-x-6 -top-8 h-20 bg-[radial-gradient(ellipse_at_center,rgba(162,221,0,0.28),transparent_70%)] opacity-70 blur-md transition-opacity duration-300 group-hover:opacity-100" />
        )}

        <div className="relative flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
              canClaim
                ? 'bg-gradient-to-br from-[rgba(162,221,0,0.2)] to-[rgba(162,221,0,0.05)] text-app-lime ring-[rgba(162,221,0,0.25)]'
                : isLocked
                  ? 'bg-yellow-400/10 text-yellow-300 ring-yellow-400/20'
                  : 'bg-app-card text-app-text-2 ring-app-hairline',
            )}
          >
            <StateIcon className="size-[18px]" strokeWidth={1.8} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-app-text">{t('title')}</p>
            <p
              className={cn(
                'mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] font-medium tabular-nums',
                canClaim ? 'text-app-lime' : isLocked ? 'text-yellow-300/80' : 'text-app-muted',
              )}
            >
              {canClaim && (
                <span className="relative flex size-1.5 shrink-0 items-center justify-center">
                  <span className="absolute size-full animate-ping rounded-full bg-app-lime/60" />
                  <span className="relative size-1.5 rounded-full bg-app-lime" />
                </span>
              )}
              {subtitle}
            </p>
          </div>

          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums',
              canClaim ? 'bg-app-lime text-app-lime-ink' : 'bg-app-card text-app-text-2',
            )}
          >
            +{amount}
          </span>
        </div>
      </button>
      {renderModals()}
    </>
  );

  function renderModals() {
    return (
      <>
        {claimOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <WeeklyClaimModal
              onClose={() => setClaimOpen(false)}
              onRequireUpgrade={() => {
                setClaimOpen(false);
                setPlansOpen(true);
              }}
            />,
            document.body,
          )}
        {plansOpen &&
          typeof document !== 'undefined' &&
          createPortal(<PlansModal onClose={() => setPlansOpen(false)} />, document.body)}
      </>
    );
  }
}
