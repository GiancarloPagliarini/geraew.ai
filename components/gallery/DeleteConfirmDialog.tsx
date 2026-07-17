'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteConfirmDialogProps {
  closing: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ closing, pending, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  const t = useTranslations('home');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(8,10,11,0.86)] p-6 backdrop-blur-[8px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={() => !pending && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('gallery.deleteTitle')}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-[400px] rounded-[18px] border border-app-hairline-2 bg-app-card p-6',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
          <Trash2 className="size-5 text-red-400" strokeWidth={1.8} />
        </span>
        <h2 className="mt-4 text-[17px] font-bold text-app-text">{t('gallery.deleteTitle')}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-app-text-2">
          {t('gallery.deleteDescription')}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-9 rounded-[10px] border border-app-hairline bg-app-surface px-4 text-[13px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card-hover disabled:opacity-50"
          >
            {t('gallery.deleteCancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex h-9 items-center gap-2 rounded-[10px] bg-red-500/90 px-4 text-[13px] font-bold text-white transition-colors duration-200 ease-app hover:bg-red-500 disabled:opacity-50"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" strokeWidth={2.5} />}
            {t('gallery.deleteConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
