'use client';

import { GraduationCap, Wrench, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const t = useTranslations('editorDialogs.tutorial');

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const ti = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(ti);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <aside className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <GraduationCap className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">{t('title')}</h2>
            <p className="text-xs text-[#f3f0ed]/30">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-6 py-8">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
            <Wrench className="h-7 w-7 text-[#a2dd00]" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-[#f3f0ed]">{t('maintenance.title')}</h3>
            <p className="text-sm text-[#f3f0ed]/50 leading-relaxed">{t('maintenance.description')}</p>
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#f3f0ed]/5 px-3 py-1 text-[10px] font-medium tracking-wider uppercase text-[#f3f0ed]/40">
            {t('maintenance.badge')}
          </span>
        </div>
      </div>
    </aside>
  );
}
