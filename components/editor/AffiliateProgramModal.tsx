'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Handshake,
  Link2,
  X,
} from 'lucide-react';

interface AffiliateProgramModalProps {
  onClose: () => void;
}

export function AffiliateProgramModal({ onClose }: AffiliateProgramModalProps) {
  const t = useTranslations('editorChrome.navbar.affiliateProgram');
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const items = [
    {
      icon: Link2,
      titleKey: 'linkTitle',
      descKey: 'linkDesc',
      iconColor: 'text-blue-400',
      bg: 'bg-blue-400/10',
      ring: 'ring-blue-400/20',
      glow: 'from-blue-400/10',
    },
    {
      icon: CircleDollarSign,
      titleKey: 'commissionTitle',
      descKey: 'commissionDesc',
      iconColor: 'text-[#a2dd00]',
      bg: 'bg-[#a2dd00]/10',
      ring: 'ring-[#a2dd00]/20',
      glow: 'from-[#a2dd00]/10',
    },
    {
      icon: BarChart3,
      titleKey: 'panelTitle',
      descKey: 'panelDesc',
      iconColor: 'text-violet-400',
      bg: 'bg-violet-400/10',
      ring: 'ring-violet-400/20',
      glow: 'from-violet-400/10',
    },
    {
      icon: CalendarClock,
      titleKey: 'payoutTitle',
      descKey: 'payoutDesc',
      iconColor: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      ring: 'ring-emerald-400/20',
      glow: 'from-emerald-400/10',
    },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sidebar-scroll relative mx-4 flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto rounded-[20px] border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-[0_24px_72px_-16px_rgba(0,0,0,0.6)]">
        {/* Ambient glow behind header */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[420px] -translate-x-1/2 rounded-full bg-[#a2dd00] opacity-[0.08] blur-3xl"
        />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t('close')}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-colors hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="relative flex flex-col items-center gap-3 px-6 pb-6 pt-11 text-center">
          <div className="flex items-center gap-1.5 rounded-full border border-[#a2dd00]/25 bg-[#a2dd00]/10 px-3 py-1 shadow-[0_0_24px_-4px_rgba(162,221,0,0.4)]">
            <Handshake className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a2dd00]">
              Geraew Afiliados
            </span>
          </div>
          <h2 className="max-w-sm text-[22px] font-bold leading-tight tracking-tight text-[#f3f0ed]">
            {t('title')}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-[#f3f0ed]/50">{t('intro')}</p>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-[#f3f0ed]/10 to-transparent" />

        {/* Items */}
        <div className="flex flex-col gap-2.5 px-6 py-5">
          {items.map((item, index) => {
            const Icon = item.icon;
            const step = String(index + 1).padStart(2, '0');
            return (
              <div
                key={item.titleKey}
                className="group relative flex gap-3.5 overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.06] bg-[#f3f0ed]/[0.02] p-4 transition-all hover:border-[#f3f0ed]/[0.12] hover:bg-[#f3f0ed]/[0.035]"
              >
                {/* Accent glow on top-left */}
                <div
                  aria-hidden
                  className={`pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${item.glow} to-transparent opacity-70 blur-xl`}
                />

                {/* Icon orb */}
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${item.bg} ${item.ring}`}
                >
                  <Icon className={`h-[18px] w-[18px] ${item.iconColor}`} />
                </div>

                {/* Content */}
                <div className="relative min-w-0 flex-1 pt-0.5 pr-7">
                  <p className="text-sm font-semibold leading-snug text-[#f3f0ed]">
                    {t(item.titleKey)}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#f3f0ed]/55">
                    {t(item.descKey)}
                  </p>
                </div>

                {/* Step number */}
                <span className="absolute right-4 top-4 font-mono text-[10px] font-semibold tracking-wide text-[#f3f0ed]/20 transition-colors group-hover:text-[#f3f0ed]/35">
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer CTAs */}
        <div className="sticky bottom-0 flex items-center gap-2.5 border-t border-[#f3f0ed]/[0.06] bg-gradient-to-t from-[#1a2123] via-[#1a2123]/95 to-[#1a2123]/80 px-6 py-4 backdrop-blur">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#f3f0ed]/[0.08] px-4 py-2.5 text-sm font-medium text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80"
          >
            {t('close')}
          </button>
          <button
            onClick={() => {
              onClose();
              router.push('/painel-afiliado');
            }}
            className="group inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] px-4 py-2.5 text-sm font-semibold text-[#1c1917] shadow-[0_0_0_1px_rgba(162,221,0,0.4),0_4px_16px_-4px_rgba(162,221,0,0.3)] transition-all hover:bg-[#b7f000] hover:shadow-[0_0_0_1px_rgba(162,221,0,0.6),0_12px_28px_-6px_rgba(162,221,0,0.5)]"
          >
            {t('cta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
