'use client';

import { Infinity as InfinityIcon, Lock, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface UnlimitedToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  /**
   * Chamado quando o usuário clica no toggle mas não tem plano elegível.
   * Use para abrir a modal de upgrade.
   */
  onRequireUpgrade: () => void;
  eligible: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  /** classes extras (ex.: ajustar padding no novo layout) */
  className?: string;
}

export function UnlimitedToggle({
  enabled,
  onToggle,
  onRequireUpgrade,
  eligible,
  isLoading = false,
  disabled = false,
  className,
}: UnlimitedToggleProps) {
  const t = useTranslations('editorPanels.unlimited');
  const accentColor = '#a855f7'; // violeta — distingue de outros toggles (#a2dd00)
  const inactiveColor = 'rgba(243,240,237,0.4)';

  const handleClick = () => {
    if (disabled) return;
    if (!eligible) {
      onRequireUpgrade();
      return;
    }
    onToggle(!enabled);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn('relative flex w-full items-center justify-between rounded-xl border px-3 py-2 transition-all', className)}
      style={{
        background: enabled ? 'rgba(168,85,247,0.08)' : 'transparent',
        borderColor: enabled ? 'rgba(168,85,247,0.25)' : 'rgba(243,240,237,0.07)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          style={{ color: enabled ? accentColor : inactiveColor }}
          className="flex h-3 w-3 items-center"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : eligible ? (
            <InfinityIcon className="h-3 w-3" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
        </span>
        <span
          className="text-[10px] font-bold tracking-[0.12em]"
          style={{ color: enabled ? accentColor : inactiveColor }}
        >
          {t('toggleLabel')}
        </span>
      </div>
      <div
        className="relative h-4 w-7 rounded-full transition-colors"
        style={{
          background: enabled ? accentColor : 'rgba(243,240,237,0.12)',
        }}
      >
        <div
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: enabled ? 'translateX(13px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  );
}
