'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  X,
  ChevronRight,
  Gift,
  Loader2,
  XCircle,
  MessageSquare,
  Trophy,
  Pause,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export type RetentionAction = 'cancel' | 'downgrade';

export interface CancelRetentionModalProps {
  action: RetentionAction;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Called when user accepts the retention offer. Receives the reason ID and offer type. */
  onAcceptOffer?: (reasonId: string) => void | Promise<void>;
  isLoading?: boolean;
  isAcceptingOffer?: boolean;
  /** What the user loses — shown in step 2 */
  lostBenefits: string[];
  /** Current plan name for display */
  currentPlanName?: string;
  /** Target plan name (for downgrades) */
  targetPlanName?: string;
  /** Date when access ends (for cancellations) */
  accessEndDate?: string;
  /** User stats for achievements step */
  userStats?: {
    totalImagesGenerated?: number;
    totalVideosGenerated?: number;
    daysSinceMember?: number;
  };
  /** Hide retention offers (user already accepted one for this subscription) */
  hideOffers?: boolean;
}

type Step = 'achievements' | 'loss' | 'reason' | 'offer' | 'final';

const CANCEL_REASON_IDS = ['expensive', 'not_using', 'quality', 'competitor', 'temporary', 'other'] as const;
const REASON_ICONS: Record<string, string> = {
  expensive: '💰',
  not_using: '😴',
  quality: '🎯',
  competitor: '🔄',
  temporary: '⏸️',
  other: '💬',
};
const REASON_I18N_KEYS: Record<string, string> = {
  expensive: 'expensive',
  not_using: 'notUsing',
  quality: 'quality',
  competitor: 'competitor',
  temporary: 'temporary',
  other: 'other',
};

/* ── Dynamic offers per reason ── */
interface RetentionOffer {
  icon: typeof Gift;
  title: string;
  subtitle: string;
  highlight: string;
  highlightSub: string;
  acceptLabel: string;
  rejectLabel: string;
}

function getOfferForReason(
  reasonId: string,
  isCancel: boolean,
  t: (key: string, values?: Record<string, string | number>) => string,
  actionWord: string,
): RetentionOffer {
  const offerKey = (() => {
    switch (reasonId) {
      case 'expensive': return 'expensive';
      case 'not_using': return 'notUsing';
      case 'quality': return 'quality';
      case 'competitor': return 'competitor';
      case 'temporary': return 'temporary';
      default: return 'default';
    }
  })();

  const icon: typeof Gift = (() => {
    switch (reasonId) {
      case 'not_using':
      case 'quality':
        return Sparkles;
      case 'temporary':
        return Pause;
      default:
        return Gift;
    }
  })();

  return {
    icon,
    title: t(`offers.${offerKey}.title`),
    subtitle: t(`offers.${offerKey}.subtitle`),
    highlight: t(`offers.${offerKey}.highlight`),
    highlightSub: t(`offers.${offerKey}.highlightSub`),
    acceptLabel: t(`offers.${offerKey}.acceptLabel`),
    rejectLabel: t(`offers.${offerKey}.rejectLabel`, { action: actionWord }),
  };
  // isCancel param retained for future logic tweaks
  void isCancel;
}

/* ── Delay hook for continue buttons ── */
function useButtonDelay(delayMs: number, trigger: boolean) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!trigger) {
      setEnabled(false);
      return;
    }
    const timer = setTimeout(() => setEnabled(true), delayMs);
    return () => clearTimeout(timer);
  }, [trigger, delayMs]);

  return enabled;
}

export function CancelRetentionModal({
  action,
  onClose,
  onConfirm,
  onAcceptOffer,
  isLoading = false,
  isAcceptingOffer = false,
  lostBenefits,
  currentPlanName,
  targetPlanName,
  accessEndDate,
  userStats,
  hideOffers = false,
}: CancelRetentionModalProps) {
  const t = useTranslations('editor.retention');
  const [step, setStep] = useState<Step>('achievements');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  const isCancel = action === 'cancel';
  const actionWord = isCancel ? t('action.cancel') : t('action.downgrade');

  // Delay for destructive action buttons
  const achievementsDelayReady = useButtonDelay(4000, step === 'achievements');
  const lossDelayReady = useButtonDelay(3000, step === 'loss');
  const offerDelayReady = useButtonDelay(5000, step === 'offer');
  const finalDelayReady = useButtonDelay(3000, step === 'final');

  const totalImages = userStats?.totalImagesGenerated ?? 0;
  const totalVideos = userStats?.totalVideosGenerated ?? 0;
  const daysMember = userStats?.daysSinceMember ?? 0;
  const hasStats = totalImages > 0 || totalVideos > 0;

  // If no stats, skip achievements step
  const handleStart = useCallback(() => {
    if (!hasStats) {
      setStep('loss');
    }
  }, [hasStats]);

  useEffect(() => {
    handleStart();
  }, [handleStart]);

  const offer = selectedReason ? getOfferForReason(selectedReason, isCancel, t, actionWord) : null;
  const OfferIcon = offer?.icon ?? Gift;

  async function handleFinalConfirm() {
    await onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="relative mx-4 flex w-full max-w-md flex-col rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Step 1: Achievements — emotional anchor ── */}
        {step === 'achievements' && hasStats && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a2dd00]/15">
                <Trophy className="h-6 w-6 text-[#a2dd00]" />
              </div>
              <h3 className="text-lg font-bold text-[#f3f0ed]">
                {t('achievements.title')}
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                {daysMember > 0
                  ? t('achievements.subtitleWithDays', { days: daysMember })
                  : t('achievements.subtitleNoDays')}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {totalImages > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/8 p-4">
                  <span className="text-2xl font-bold text-[#a2dd00]">
                    {totalImages.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#a2dd00]/60">{t('achievements.imagesLabel')}</span>
                </div>
              )}
              {totalVideos > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/8 p-4">
                  <span className="text-2xl font-bold text-[#a2dd00]">
                    {totalVideos.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#a2dd00]/60">{t('achievements.videosLabel')}</span>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-[#f3f0ed]/35">
              {t('achievements.footer')}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d]"
              >
                {t('achievements.keep')}
              </button>
              <button
                onClick={() => setStep('loss')}
                disabled={!achievementsDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40 disabled:cursor-default disabled:opacity-0"
              >
                {t('achievements.anyway', { action: actionWord })}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Loss — show what they lose with visual comparison ── */}
        {step === 'loss' && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-[#f3f0ed]">
                {t('loss.title')}
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                {isCancel
                  ? t('loss.cancelIntro')
                  : t('loss.downgradeIntro', {
                      current: currentPlanName ?? t('loss.currentPlanFallback'),
                      target: targetPlanName ?? t('loss.targetPlanFallback'),
                    })}
              </p>
            </div>

            {/* Benefits lost with downgrade arrow */}
            <div className="flex flex-col gap-2 rounded-xl border border-red-500/15 bg-red-500/5 p-4">
              {lostBenefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2.5">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/70" />
                  <span className="text-sm text-[#f3f0ed]/60">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Downgrade visual indicator */}
            {!isCancel && currentPlanName && targetPlanName && (
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-3 py-1 font-bold text-[#a2dd00]">
                  {currentPlanName}
                </span>
                <ArrowDown className="h-4 w-4 text-red-400/60" />
                <span className="rounded-full border border-red-500/20 bg-red-500/8 px-3 py-1 font-bold text-red-400">
                  {targetPlanName}
                </span>
              </div>
            )}

            {accessEndDate && isCancel && (
              <p className="text-center text-xs text-[#f3f0ed]/35">
                {t('loss.accessEndPrefix')}{' '}
                <span className="font-medium text-[#f3f0ed]/50">{accessEndDate}</span>
                {t('loss.accessEndSuffix')}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d]"
              >
                {t('loss.keep')}
              </button>
              <button
                onClick={() => setStep(hideOffers ? 'final' : 'reason')}
                disabled={!lossDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40 disabled:cursor-default disabled:opacity-0"
              >
                {t('loss.continue')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Reason — collect feedback ── */}
        {step === 'reason' && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f0ed]/5">
                <MessageSquare className="h-6 w-6 text-[#f3f0ed]/50" />
              </div>
              <h3 className="text-lg font-bold text-[#f3f0ed]">
                {t('reason.title')}
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                {t('reason.subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {CANCEL_REASON_IDS.map((reasonId) => (
                <button
                  key={reasonId}
                  onClick={() => setSelectedReason(reasonId)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${selectedReason === reasonId
                    ? 'border-[#a2dd00]/40 bg-[#a2dd00]/8 text-[#f3f0ed]'
                    : 'border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:border-[#f3f0ed]/15 hover:bg-[#f3f0ed]/5'
                    }`}
                >
                  <span className="text-base">{REASON_ICONS[reasonId]}</span>
                  <span className="flex-1">{t(`reasons.${REASON_I18N_KEYS[reasonId]}`)}</span>
                  {selectedReason === reasonId && (
                    <span className="h-2 w-2 rounded-full bg-[#a2dd00]" />
                  )}
                </button>
              ))}
            </div>

            {/* Optional feedback textarea */}
            <textarea
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value)}
              placeholder={t('reason.feedbackPlaceholder')}
              className="h-16 w-full resize-none rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-4 py-3 text-xs text-[#f3f0ed]/70 placeholder:text-[#f3f0ed]/20 focus:border-[#f3f0ed]/20 focus:outline-none"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep('offer')}
                disabled={!selectedReason}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/10 text-sm font-medium text-[#f3f0ed]/50 transition-colors hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed]/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t('reason.continue')}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStep(hasStats ? 'achievements' : 'loss')}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40"
              >
                {t('reason.back')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Dynamic offer based on reason ── */}
        {step === 'offer' && offer && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a2dd00]/15">
                <OfferIcon className="h-6 w-6 text-[#a2dd00]" />
              </div>
              <h3 className="text-lg font-bold text-[#f3f0ed]">
                {offer.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#f3f0ed]/50">
                {offer.subtitle}
              </p>
            </div>

            {/* Offer highlight */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-[#a2dd00]/25 bg-[#a2dd00]/8 p-5">
              <span className="text-3xl font-bold text-[#a2dd00]">
                {offer.highlight}
              </span>
              <span className="text-xs text-[#a2dd00]/60">
                {offer.highlightSub}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (onAcceptOffer && selectedReason) {
                    onAcceptOffer(selectedReason);
                  } else {
                    onClose();
                  }
                }}
                disabled={isAcceptingOffer}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d] disabled:opacity-60"
              >
                {isAcceptingOffer ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  offer.acceptLabel
                )}
              </button>
              <button
                onClick={() => setStep('final')}
                disabled={!offerDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/20 transition-colors hover:text-[#f3f0ed]/35 disabled:cursor-default disabled:opacity-0"
              >
                {offer.rejectLabel}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Final confirmation ── */}
        {step === 'final' && (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-[#f3f0ed]">
                {t('final.title')}
              </h3>
              <p className="text-sm leading-relaxed text-[#f3f0ed]/50">
                {isCancel
                  ? t('final.cancelBody', {
                      plan: currentPlanName ?? '',
                      when: accessEndDate
                        ? t('final.cancelWhenDate', { date: accessEndDate })
                        : t('final.cancelWhenDefault'),
                    })
                  : t('final.downgradeBody', {
                      current: currentPlanName ?? '',
                      target: targetPlanName ?? '',
                    })}
              </p>
            </div>

            {/* Summary of consequences */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#f3f0ed]/30">
                {t('final.afterDate')}
              </p>
              <div className="flex flex-col gap-1.5">
                {isCancel ? (
                  <>
                    <ConsequenceItem text={t('final.cancel.creditsReset')} />
                    <ConsequenceItem text={t('final.cancel.watermark')} />
                    <ConsequenceItem text={t('final.cancel.lowPriority')} />
                    <ConsequenceItem text={t('final.cancel.noPremium')} />
                  </>
                ) : (
                  <>
                    <ConsequenceItem text={t('final.downgrade.creditsReduced')} />
                    <ConsequenceItem text={t('final.downgrade.featuresRemoved')} />
                  </>
                )}
              </div>
            </div>

            {accessEndDate && (
              <p className="text-center text-xs text-[#f3f0ed]/30">
                {t.rich('final.reactivate', {
                  date: accessEndDate,
                  accent: (chunks) => <span className="font-medium text-[#f3f0ed]/45">{chunks}</span>,
                })}
              </p>
            )}

            <div className="flex flex-col gap-2">
              {/* Keep plan — BIG, green, prominent */}
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d] disabled:opacity-50"
              >
                {t('final.keep')}
              </button>

              {/* Confirm cancel — small, gray, no emphasis */}
              <button
                onClick={handleFinalConfirm}
                disabled={isLoading || !finalDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/20 transition-colors hover:text-[#f3f0ed]/40 disabled:cursor-default disabled:opacity-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#f3f0ed]/30" />
                ) : (
                  isCancel ? t('final.confirmCancel') : t('final.confirmDowngrade')
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helper ── */
function ConsequenceItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/50" />
      <span className="text-xs text-[#f3f0ed]/40">{text}</span>
    </div>
  );
}
