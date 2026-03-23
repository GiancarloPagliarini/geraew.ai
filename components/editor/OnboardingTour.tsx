'use client';

import Joyride, {
  type CallBackProps,
  type Step,
  type TooltipRenderProps,
  STATUS,
} from 'react-joyride';
import { useEffect, useState } from 'react';
import { GraduationCap, Smile, SquareMousePointer, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    disableOverlayClose: true,
    title: 'welcome',
    content: '',
  },
  {
    target: '#tour-tutorial-btn',
    placement: 'right',
    disableBeacon: true,
    disableOverlayClose: true,
    title: 'tutorials',
    content: '',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    disableOverlayClose: true,
    title: 'finish',
    content: '',
  },
];

const stepContent: Record<
  string,
  { icon: React.ReactNode; heading: string; body: string; extra?: React.ReactNode }
> = {
  welcome: {
    icon: <Smile className="h-5 w-5 text-[#a2dd00]" />,
    heading: 'Bem-vindo ao Geraew AI',
    body: 'Crie imagens incríveis, vídeos cinematográficos e influencers digitais com IA — tudo em um só lugar. Deixa a gente te guiar rapidinho.',
  },
  tutorials: {
    icon: <GraduationCap className="h-5 w-5 text-[#a2dd00]" />,
    heading: 'Tutoriais da plataforma',
    body: 'Este botão abre os tutoriais da plataforma. Aprenda a gerar imagens, vídeos e criar sua IA Influencer.',
  },
  finish: {
    icon: <SquareMousePointer className="h-5 w-5 text-[#a2dd00]" />,
    heading: 'Tudo pronto. Vamos criar!',
    body: 'Use no painel "Gerar imagem" para adicionar um painel, escreva seu prompt e gere sua primeira imagem com IA :D',
  },
};

function TourTooltip({
  index,
  step,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: TooltipRenderProps) {
  const key = step.title as string;
  const content = stepContent[key];

  return (
    <div
      {...tooltipProps}
      className="relative w-[320px] rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-5 shadow-2xl"
      style={{ fontFamily: 'var(--font-inter, sans-serif)' }}
    >
      {/* Close */}
      <button
        {...closeProps}
        className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]/70"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Icon + heading */}
      <div className="flex items-center gap-2.5 pr-8">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
          {content.icon}
        </div>
        <h3 className="text-sm font-semibold text-[#f3f0ed] leading-tight">{content.heading}</h3>
      </div>

      {/* Body */}
      <p className="mt-3 text-xs leading-relaxed text-[#f3f0ed]/50">{content.body}</p>

      {/* Extra */}
      {content.extra && <div className="mt-3">{content.extra}</div>}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index
                ? 'w-4 bg-[#a2dd00]'
                : i < index
                  ? 'w-1.5 bg-[#a2dd00]/30'
                  : 'w-1.5 bg-[#f3f0ed]/10'
                }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isLastStep && (
            <button
              {...skipProps}
              className="text-[11px] text-[#f3f0ed]/30 transition-colors hover:text-[#f3f0ed]/60"
            >
              Pular
            </button>
          )}
          <button
            {...primaryProps}
            className="rounded-lg bg-[#a2dd00] px-3.5 py-1.5 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
          >
            {isLastStep ? 'Receber créditos' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTour() {
  const { user, accessToken } = useAuth();
  const [run, setRun] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.hasCompletedOnboarding === false) {
      const t = setTimeout(() => setRun(true), 700);
      return () => clearTimeout(t);
    }
  }, [user]);

  function handleCallback({ status }: CallBackProps) {
    const skipped = (status as string) === STATUS.SKIPPED;
    const finished = (status as string) === STATUS.FINISHED;

    if (skipped) {
      setRun(false);
      if (accessToken) {
        api.users.completeOnboarding(accessToken);
      }
    }

    if (finished) {
      setRun(false);
      if (accessToken) {
        api.users.completeOnboarding(accessToken).then(() => {
          queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
          toast.success('Parabéns! Você acabou de ganhar créditos grátis 🎉');
        });
      }
    }
  }

  return (
    <>
      <Joyride
        run={run}
        steps={steps}
        continuous
        disableScrolling
        tooltipComponent={TourTooltip}
        callback={handleCallback}
        styles={{
          options: {
            zIndex: 9999,
            overlayColor: 'rgba(0, 0, 0, 0.7)',
          },
          spotlight: {
            borderRadius: 10,
            boxShadow: '0 0 0 2px rgba(162, 221, 0, 0.3)',
          },
        }}
      />
    </>
  );
}
