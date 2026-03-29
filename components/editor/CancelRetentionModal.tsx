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

const CANCEL_REASONS = [
  { id: 'expensive', label: 'Esta caro para mim', icon: '💰' },
  { id: 'not_using', label: 'Nao estou usando o suficiente', icon: '😴' },
  { id: 'quality', label: 'A qualidade nao atende minhas expectativas', icon: '🎯' },
  { id: 'competitor', label: 'Encontrei uma alternativa melhor', icon: '🔄' },
  { id: 'temporary', label: 'Preciso pausar temporariamente', icon: '⏸️' },
  { id: 'other', label: 'Outro motivo', icon: '💬' },
];

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
): RetentionOffer {
  const actionWord = isCancel ? 'cancelar' : 'fazer downgrade';

  switch (reasonId) {
    case 'expensive':
      return {
        icon: Gift,
        title: 'E se o preco nao fosse um problema?',
        subtitle:
          'Sabemos que investir em ferramentas precisa fazer sentido. Por isso, preparamos algo especial so pra voce:',
        highlight: '15% OFF',
        highlightSub: 'nos proximos 2 meses',
        acceptLabel: 'Aceitar desconto e continuar',
        rejectLabel: `Nao, quero ${actionWord} mesmo assim`,
      };

    case 'not_using':
      return {
        icon: Sparkles,
        title: 'Talvez voce ainda nao tenha descoberto o melhor da GeraEW.',
        subtitle:
          '90% dos criadores que mais faturam usam funcionalidades que voce talvez nao tenha explorado. Vamos te dar uma chance de testar tudo:',
        highlight: '+50 creditos bonus',
        highlightSub: 'para explorar agora',
        acceptLabel: 'Explorar com creditos bonus',
        rejectLabel: `Nao tenho interesse, quero ${actionWord}`,
      };

    case 'quality':
      return {
        icon: Sparkles,
        title: 'Atualizamos nossos modelos recentemente.',
        subtitle:
          'Nosso time esta constantemente melhorando a qualidade das geracoes. Que tal testar as melhorias com creditos extras?',
        highlight: '+30 creditos',
        highlightSub: 'para testar as melhorias',
        acceptLabel: 'Testar melhorias com bonus',
        rejectLabel: `Nao, quero ${actionWord} mesmo assim`,
      };

    case 'competitor':
      return {
        icon: Gift,
        title: 'Antes de ir, veja o que so a GeraEW faz.',
        subtitle:
          'Motion Control, Face Swap e Video em 4K com IA sao exclusivos da nossa plataforma. Que tal creditos extras para testar tudo antes de decidir?',
        highlight: '+100 creditos bonus',
        highlightSub: 'para comparar a fundo',
        acceptLabel: 'Receber creditos e comparar',
        rejectLabel: `Nao, quero ${actionWord} mesmo assim`,
      };

    case 'temporary':
      return {
        icon: Pause,
        title: 'Que tal pausar em vez de cancelar?',
        subtitle:
          'Congele sua assinatura por ate 30 dias. Sem cobranca, sem perder seus dados. Quando voltar, tudo estara exatamente como voce deixou.',
        highlight: 'Pausar 30 dias',
        highlightSub: 'sem cobranca, sem perder nada',
        acceptLabel: 'Pausar minha assinatura por 30 dias',
        rejectLabel: `Prefiro ${actionWord} definitivamente`,
      };

    default:
      return {
        icon: Gift,
        title: 'Queremos te manter conosco.',
        subtitle:
          'Antes de ir, que tal aproveitar uma oferta exclusiva para continuar criando conteudo profissional?',
        highlight: '20% OFF',
        highlightSub: 'na proxima renovacao',
        acceptLabel: 'Aceitar desconto e continuar',
        rejectLabel: `Nao, quero ${actionWord} mesmo assim`,
      };
  }
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
  const [step, setStep] = useState<Step>('achievements');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  const isCancel = action === 'cancel';
  const actionLabel = isCancel ? 'cancelar' : 'fazer downgrade';

  // Delay for destructive action buttons (4 seconds)
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

  const offer = selectedReason ? getOfferForReason(selectedReason, isCancel) : null;
  const OfferIcon = offer?.icon ?? Gift;

  async function handleFinalConfirm() {
    // TODO: Send selectedReason + additionalFeedback to backend
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
                Voce construiu algo incrivel aqui.
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                {daysMember > 0
                  ? `Nos ultimos ${daysMember} dias, voce criou conteudo profissional com a GeraEW.`
                  : 'Veja o que voce ja conquistou com a GeraEW.'}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {totalImages > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/8 p-4">
                  <span className="text-2xl font-bold text-[#a2dd00]">
                    {totalImages.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#a2dd00]/60">imagens criadas</span>
                </div>
              )}
              {totalVideos > 0 && (
                <div className="flex flex-col items-center gap-1 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/8 p-4">
                  <span className="text-2xl font-bold text-[#a2dd00]">
                    {totalVideos.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[11px] text-[#a2dd00]/60">videos criados</span>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-[#f3f0ed]/35">
              Seus influencers digitais estao prontos para trabalhar por voce.
              Tem certeza que quer perder acesso a tudo isso?
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d]"
              >
                Continuar Criando
              </button>
              <button
                onClick={() => setStep('loss')}
                disabled={!achievementsDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40 disabled:cursor-default disabled:opacity-0"
              >
                Mesmo assim, quero {actionLabel}
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
                Isso e o que voce perde ao sair.
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                {isCancel
                  ? 'Ao cancelar sua assinatura, voce perde acesso a:'
                  : (
                    <>
                      Ao mudar de{' '}
                      <span className="font-semibold text-[#f3f0ed]/70">
                        {currentPlanName ?? 'seu plano atual'}
                      </span>{' '}
                      para{' '}
                      <span className="font-semibold text-red-400/80">
                        {targetPlanName ?? 'um plano menor'}
                      </span>
                      :
                    </>
                  )}
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
                Voce tera acesso ate{' '}
                <span className="font-medium text-[#f3f0ed]/50">{accessEndDate}</span>.
                Apos essa data, perdera tudo listado acima.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d]"
              >
                Quero manter meu plano
              </button>
              <button
                onClick={() => setStep(hideOffers ? 'final' : 'reason')}
                disabled={!lossDelayReady}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40 disabled:cursor-default disabled:opacity-0"
              >
                Entendo, quero continuar
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
                Nos ajude a melhorar.
              </h3>
              <p className="text-sm text-[#f3f0ed]/50">
                Saber o motivo nos ajuda a construir uma plataforma melhor para todos.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${selectedReason === reason.id
                    ? 'border-[#a2dd00]/40 bg-[#a2dd00]/8 text-[#f3f0ed]'
                    : 'border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-[#f3f0ed]/60 hover:border-[#f3f0ed]/15 hover:bg-[#f3f0ed]/5'
                    }`}
                >
                  <span className="text-base">{reason.icon}</span>
                  <span className="flex-1">{reason.label}</span>
                  {selectedReason === reason.id && (
                    <span className="h-2 w-2 rounded-full bg-[#a2dd00]" />
                  )}
                </button>
              ))}
            </div>

            {/* Optional feedback textarea */}
            <textarea
              value={additionalFeedback}
              onChange={(e) => setAdditionalFeedback(e.target.value)}
              placeholder="Conte mais sobre sua decisao (opcional)"
              className="h-16 w-full resize-none rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-4 py-3 text-xs text-[#f3f0ed]/70 placeholder:text-[#f3f0ed]/20 focus:border-[#f3f0ed]/20 focus:outline-none"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep('offer')}
                disabled={!selectedReason}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/10 text-sm font-medium text-[#f3f0ed]/50 transition-colors hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed]/70 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStep(hasStats ? 'achievements' : 'loss')}
                className="flex h-9 w-full items-center justify-center rounded-xl text-xs text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/40"
              >
                Voltar
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
                Ultima confirmacao.
              </h3>
              <p className="text-sm leading-relaxed text-[#f3f0ed]/50">
                {isCancel
                  ? (
                    <>
                      Seu plano <span className="font-semibold text-[#f3f0ed]/70">{currentPlanName}</span> sera
                      encerrado{accessEndDate ? ` em ${accessEndDate}` : ' ao fim do periodo atual'}.
                    </>
                  )
                  : (
                    <>
                      Seu plano sera alterado de{' '}
                      <span className="font-semibold text-[#f3f0ed]/70">{currentPlanName}</span> para{' '}
                      <span className="font-semibold text-red-400/80">{targetPlanName}</span> na proxima
                      renovacao.
                    </>
                  )}
              </p>
            </div>

            {/* Summary of consequences */}
            <div className="flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#f3f0ed]/30">
                APOS ESSA DATA:
              </p>
              <div className="flex flex-col gap-1.5">
                {isCancel ? (
                  <>
                    <ConsequenceItem text="Seus creditos voltam para o plano Free" />
                    <ConsequenceItem text="Geracoes futuras terao marca d'agua" />
                    <ConsequenceItem text="Voce perde prioridade na fila de geracao" />
                    <ConsequenceItem text="Funcionalidades premium ficam indisponiveis" />
                  </>
                ) : (
                  <>
                    <ConsequenceItem text="Seus creditos serao reduzidos" />
                    <ConsequenceItem text="Funcionalidades exclusivas do plano atual serao removidas" />
                  </>
                )}
              </div>
            </div>

            {accessEndDate && (
              <p className="text-center text-xs text-[#f3f0ed]/30">
                Voce pode reativar a qualquer momento antes de{' '}
                <span className="font-medium text-[#f3f0ed]/45">{accessEndDate}</span>.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {/* Keep plan — BIG, green, prominent */}
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#a2dd00] text-sm font-bold text-[#1a2123] transition-colors hover:bg-[#b5e82d] disabled:opacity-50"
              >
                Mudei de ideia, quero manter meu plano
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
                  `Confirmar ${isCancel ? 'cancelamento' : 'downgrade'}`
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
