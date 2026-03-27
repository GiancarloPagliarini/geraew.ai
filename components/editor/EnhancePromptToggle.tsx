'use client';

import { Loader2, Sparkles } from 'lucide-react';

interface EnhancePromptToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  isEnhancing?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function EnhancePromptToggle({
  enabled,
  onToggle,
  isEnhancing = false,
  disabled = false,
  icon,
}: EnhancePromptToggleProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-xl border px-3 py-2 transition-all"
      style={{
        background: enabled ? 'rgba(162,221,0,0.06)' : 'transparent',
        borderColor: enabled ? 'rgba(162,221,0,0.2)' : 'rgba(243,240,237,0.07)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: enabled ? '#a2dd00' : 'rgba(243,240,237,0.3)' }} className="flex h-3 w-3 items-center">
          {icon ?? <Sparkles className="h-3 w-3" />}
        </span>
        <span
          className="text-[10px] font-bold tracking-[0.12em]"
          style={{ color: enabled ? '#a2dd00' : 'rgba(243,240,237,0.4)' }}
        >
          {isEnhancing ? 'MELHORANDO...' : 'MELHORAR PROMPT'}
        </span>
        {isEnhancing && <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]" />}
      </div>
      <div
        className="relative h-4 w-7 rounded-full transition-colors"
        style={{ background: enabled ? '#a2dd00' : 'rgba(243,240,237,0.12)' }}
      >
        <div
          className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: enabled ? 'translateX(13px)' : 'translateX(2px)' }}
        />
      </div>
    </button>
  );
}
