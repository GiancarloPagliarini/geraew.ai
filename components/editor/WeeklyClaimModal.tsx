'use client';

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Check, Crown, Gift, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface WeeklyClaimModalProps {
  onClose: () => void;
  onRequireUpgrade: () => void;
}

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { d, h, m, s };
}

export function WeeklyClaimModal({ onClose, onRequireUpgrade }: WeeklyClaimModalProps) {
  const t = useTranslations('editorRewards.weeklyModal');
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [celebrating, setCelebrating] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['rewards', 'weeklyClaim'],
    queryFn: () => api.rewards.weeklyClaimStatus(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 60_000,
  });

  const claimMutation = useMutation({
    mutationFn: () => api.rewards.claimWeekly(accessToken!),
    onSuccess: (data) => {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 1600);
      queryClient.setQueryData(['rewards', 'weeklyClaim'], data);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      toast.success(t('successToast', { amount: data.amount }));
    },
    onError: (err: Error) => {
      toast.error(err.message || t('errorToast'));
    },
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const targetMs = useMemo(() => {
    if (!status) return null;
    if (status.canClaim) return null;
    return new Date(status.nextWindowOpensAt).getTime();
  }, [status]);

  const countdown = targetMs !== null ? formatCountdown(targetMs - now) : null;

  const isLocked = !!status && !status.isPaying;
  const showClaimButton = !!status && status.canClaim;
  const showCountdown = !!status && !status.canClaim && status.isPaying;
  const amount = status?.amount ?? 4;

  const steps: { icon: typeof Calendar; title: string; desc: string }[] = [
    {
      icon: Calendar,
      title: t('step1Title'),
      desc: t('step1Desc'),
    },
    {
      icon: Zap,
      title: t('step2Title'),
      desc: t('step2Desc'),
    },
    {
      icon: Check,
      title: t('step3Title'),
      desc: t('step3Desc'),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex w-full max-w-md flex-col overflow-hidden rounded-[24px] border border-[#f3f0ed]/[0.08] bg-[#15191b] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-landing-text/50 backdrop-blur-md transition-all hover:bg-black/50 hover:text-landing-text"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden border-b border-[#f3f0ed]/[0.05] bg-gradient-to-br from-[#1a2123] via-[#15191b] to-[#0e1213] px-6 pb-7 pt-9 text-center">
          {/* Decorative gradient mesh */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(162,221,0,0.18),transparent_60%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#a2dd00]/30 blur-[60px]"
          />

          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              <span className="pointer-events-none absolute -inset-3 rounded-3xl bg-[#a2dd00]/40 opacity-60 blur-xl animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c8ff3f] via-[#a2dd00] to-[#7eb800] shadow-[0_8px_28px_-6px_rgba(162,221,0,0.7)] ring-1 ring-[#c8ff3f]/70">
                <Gift className="h-8 w-8 text-[#0e1213]" strokeWidth={1.8} />
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-black tabular-nums leading-none text-[#a2dd00] drop-shadow-[0_0_18px_rgba(162,221,0,0.35)]">
                  +{amount}
                </span>
                <span className="text-sm font-bold uppercase tracking-[0.18em] text-[#f3f0ed]/70">
                  {t('videosLabel')}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a2dd00]/80">
                {t('modelName')}
              </span>
            </div>

            <h2 className="max-w-sm text-base font-semibold leading-snug text-[#f3f0ed]">
              {t.rich('headline', {
                amount,
                accent: (chunks) => <span className="text-[#a2dd00]">{chunks}</span>,
              })}
            </h2>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="flex flex-col gap-2 px-6 py-5">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3f0ed]/35">
            {t('howItWorks')}
          </span>
          <div className="flex flex-col gap-1.5">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.05] bg-[#f3f0ed]/[0.02] px-3.5 py-3 transition-colors hover:border-[#a2dd00]/20 hover:bg-[#a2dd00]/[0.03]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#a2dd00]/15 to-[#a2dd00]/5 ring-1 ring-[#a2dd00]/20">
                    <Icon className="h-4 w-4 text-[#a2dd00]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#f3f0ed]">{step.title}</span>
                    <span className="text-[11px] leading-snug text-[#f3f0ed]/50">{step.desc}</span>
                  </div>
                  <span className="ml-auto font-mono text-[10px] font-bold tabular-nums text-[#f3f0ed]/20">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Action area ── */}
        <div className="flex flex-col gap-3 border-t border-[#f3f0ed]/[0.05] bg-[#f3f0ed]/[0.015] px-6 py-5">
          {isLocked && (
            <button
              onClick={onRequireUpgrade}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-yellow-400/40 bg-gradient-to-r from-yellow-400/10 via-yellow-400/15 to-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-200 transition-all hover:border-yellow-400/70 hover:text-yellow-100"
            >
              <Crown className="h-4 w-4" />
              {t('subscribeCta')}
            </button>
          )}

          {showClaimButton && (
            <div className="group relative w-full">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl bg-[#a2dd00] opacity-30 blur-[6px] animate-pulse"
              />
              <button
                onClick={() => {
                  if (!claimMutation.isPending && !celebrating) claimMutation.mutate();
                }}
                disabled={claimMutation.isPending || celebrating}
                style={celebrating ? { animation: 'claim-shake 500ms ease-in-out' } : undefined}
                className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#c8ff3f] via-[#a2dd00] to-[#7eb800] px-4 py-3 text-sm font-black text-[#0e1213] shadow-[0_0_8px_-2px_rgba(162,221,0,0.4)] ring-1 ring-[#c8ff3f]/60 transition-all hover:shadow-[0_0_12px_-2px_rgba(162,221,0,0.6)] hover:ring-[#c8ff3f]/90 disabled:cursor-not-allowed"
              >
                {/* Shine sweep */}
                {!celebrating && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent group-hover:translate-x-full transition-transform duration-700"
                  />
                )}

                <Gift
                  className="relative h-4 w-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
                  style={
                    celebrating
                      ? { animation: 'claim-gift-bounce 700ms ease-out' }
                      : claimMutation.isPending
                        ? { animation: 'claim-gift-bounce 600ms ease-in-out infinite' }
                        : undefined
                  }
                />
                <span className="relative">{t('claimCta', { amount: status?.amount ?? 4 })}</span>

                {/* Celebration overlay */}
                {celebrating && (
                  <>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-xl bg-white"
                      style={{ animation: 'claim-flash 700ms ease-out forwards' }}
                    />
                    {Array.from({ length: 18 }).map((_, i) => {
                      const angle = (i / 18) * Math.PI * 2;
                      const distance = 60 + (i % 3) * 14;
                      const dx = Math.cos(angle) * distance;
                      const dy = Math.sin(angle) * distance;
                      const colors = ['#fbbf24', '#a2dd00', '#ffffff', '#c8ff3f'];
                      const color = colors[i % colors.length];
                      return (
                        <span
                          key={i}
                          aria-hidden
                          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
                          style={
                            {
                              backgroundColor: color,
                              boxShadow: `0 0 8px ${color}`,
                              animation: `claim-burst 1000ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`,
                              animationDelay: `${i * 12}ms`,
                              '--dx': `${dx}px`,
                              '--dy': `${dy}px`,
                            } as CSSProperties
                          }
                        />
                      );
                    })}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                    >
                      <span
                        className="text-3xl font-black text-[#0e1213] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                        style={{ animation: 'claim-pop 1300ms ease-out forwards' }}
                      >
                        +{status?.amount ?? 4}
                      </span>
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {showCountdown && countdown && (
            <div className="flex w-full flex-col items-center gap-2.5 rounded-xl border border-[#f3f0ed]/[0.06] bg-gradient-to-b from-[#0e1213] to-[#15191b] px-4 py-4 ring-1 ring-inset ring-[#a2dd00]/10">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#f3f0ed]/40">
                {t('nextClaimIn')}
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { value: countdown.d, label: t('unitDays') },
                  { value: countdown.h, label: t('unitHours') },
                  { value: countdown.m, label: t('unitMinutes') },
                  { value: countdown.s, label: t('unitSeconds') },
                ].map((unit, i, arr) => (
                  <div key={unit.label} className="flex items-center gap-1.5">
                    <div className="flex flex-col items-center">
                      <span className="font-mono text-2xl font-black tabular-nums leading-none text-[#a2dd00] drop-shadow-[0_0_12px_rgba(162,221,0,0.5)]">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-[#f3f0ed]/35">
                        {unit.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="font-mono text-xl font-black leading-none text-[#a2dd00]/30">:</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
