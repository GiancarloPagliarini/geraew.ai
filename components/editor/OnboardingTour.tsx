'use client';

import Joyride, {
  type CallBackProps,
  type Step,
  type TooltipRenderProps,
  STATUS,
} from 'react-joyride';
import { useEffect, useState } from 'react';
import { GraduationCap, Smile, SquareMousePointer, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

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

const stepIcons: Record<string, React.ReactNode> = {
  welcome: <Smile className="h-5 w-5 text-[#a2dd00]" />,
  tutorials: <GraduationCap className="h-5 w-5 text-[#a2dd00]" />,
  finish: <SquareMousePointer className="h-5 w-5 text-[#a2dd00]" />,
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
  const icon = stepIcons[key];
  const t = useTranslations('editorMisc.onboarding');
  const heading = t(`steps.${key}.heading`);
  const body = t(`steps.${key}.body`);

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
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-[#f3f0ed] leading-tight">{heading}</h3>
      </div>

      {/* Body */}
      <p className="mt-3 text-xs leading-relaxed text-[#f3f0ed]/50">{body}</p>

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
              {t('actions.skip')}
            </button>
          )}
          <button
            {...primaryProps}
            className="rounded-lg bg-[#a2dd00] px-3.5 py-1.5 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
          >
            {isLastStep ? t('actions.finish') : t('actions.next')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingTour() {
  const { user, accessToken, refreshToken, updateAuth } = useAuth();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (user && user.hasCompletedOnboarding === false) {
      const t = setTimeout(() => setRun(true), 700);
      return () => clearTimeout(t);
    }
  }, [user]);

  function completeAndUpdateAuth() {
    if (!accessToken || !refreshToken || !user) return;
    api.users.completeOnboarding(accessToken).then(() => {
      updateAuth({
        accessToken,
        refreshToken,
        user: { ...user, hasCompletedOnboarding: true },
      });
    });
  }

  function handleCallback({ status }: CallBackProps) {
    const skipped = (status as string) === STATUS.SKIPPED;
    const finished = (status as string) === STATUS.FINISHED;

    if (skipped) {
      setRun(false);
      completeAndUpdateAuth();
    }

    if (finished) {
      setRun(false);
      completeAndUpdateAuth();
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
