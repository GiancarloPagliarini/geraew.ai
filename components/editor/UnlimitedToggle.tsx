'use client';

import { Infinity as InfinityIcon, Lock, Loader2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  /** Todos os modelos do plano ilimitado estão em manutenção — mostra o alerta. */
  inMaintenance?: boolean;
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
  inMaintenance = false,
  className,
}: UnlimitedToggleProps) {
  const t = useTranslations('editorPanels.unlimited');
  const accentColor = '#a855f7'; // violeta — distingue de outros toggles (#a2dd00)
  const inactiveColor = 'rgba(243,240,237,0.4)';

  const handleClick = () => {
    if (disabled) return;
    // sem modelo ilimitado ativo não há o que ligar — o alerta ao lado do label explica
    if (inMaintenance) return;
    if (!eligible) {
      onRequireUpgrade();
      return;
    }
    onToggle(!enabled);
  };

  const toggle = (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn('relative flex w-full items-center justify-between rounded-xl border px-3 py-2 transition-all', className)}
      style={{
        background: enabled ? 'rgba(168,85,247,0.08)' : 'transparent',
        borderColor: enabled ? 'rgba(168,85,247,0.25)' : 'rgba(243,240,237,0.07)',
        opacity: disabled ? 0.4 : inMaintenance ? 0.55 : 1,
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
        {inMaintenance && <TriangleAlert className="h-3 w-3 text-amber-400" strokeWidth={2} />}
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

  if (!inMaintenance) return toggle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{toggle}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="max-w-[168px]">
        {t('maintenanceTooltip')}
      </TooltipContent>
    </Tooltip>
  );
}
