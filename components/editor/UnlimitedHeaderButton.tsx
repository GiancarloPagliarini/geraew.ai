'use client';

import { Infinity as InfinityIcon, Lock, Loader2 } from 'lucide-react';

interface UnlimitedHeaderButtonProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  onRequireUpgrade: () => void;
  eligible: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Toggle do modo ilimitado para o header do painel — mostra ícone + texto
 * "Ilimitado". Cor violeta quando ativo, cinza quando inativo, lock quando
 * o usuário não tem plano com modo ilimitado.
 */
export function UnlimitedHeaderButton({
  enabled,
  onToggle,
  onRequireUpgrade,
  eligible,
  isLoading = false,
  disabled = false,
}: UnlimitedHeaderButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!eligible) {
      onRequireUpgrade();
      return;
    }
    onToggle(!enabled);
  };

  const title = !eligible
    ? 'Ativar modo ilimitado'
    : enabled
      ? 'Desativar modo ilimitado'
      : 'Ativar modo ilimitado';

  // Estilos visuais por estado — inativo precisa "convidar" o clique
  // (borda + bg violeta sutis), ativo fica saturado.
  const { color, background, border, hoverBackground } = enabled
    ? {
        color: '#a855f7',
        background: 'rgba(168,85,247,0.15)',
        border: '1px solid rgba(168,85,247,0.5)',
        hoverBackground: 'rgba(168,85,247,0.22)',
      }
    : {
        color: 'rgba(192,132,252,0.85)',
        background: 'rgba(168,85,247,0.06)',
        border: '1px solid rgba(168,85,247,0.25)',
        hoverBackground: 'rgba(168,85,247,0.12)',
      };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={title}
      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBackground)}
      onMouseLeave={(e) => (e.currentTarget.style.background = background)}
      className="flex h-6 items-center gap-1 rounded-full px-2 transition-all disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background, border }}
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" style={{ color }} />
      ) : !eligible ? (
        <Lock className="h-3 w-3" style={{ color }} />
      ) : (
        <InfinityIcon className="h-3.5 w-3.5" style={{ color }} />
      )}
      <span
        className="text-[10px] font-bold uppercase tracking-[0.1em]"
        style={{ color }}
      >
        Ilimitado
      </span>
    </button>
  );
}
