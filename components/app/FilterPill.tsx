'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterPillProps {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

/** Chip de filtro padrão: pill com ícone e/ou label; ativo = lime. */
export function FilterPill({
  active,
  onClick,
  icon: Icon,
  children,
  className,
  ...rest
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rest['aria-label']}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors duration-200 ease-app',
        active ? 'bg-app-lime text-app-lime-ink' : 'bg-app-surface text-app-text-2 hover:text-app-text',
        className,
      )}
    >
      {Icon && <Icon className="size-[15px]" strokeWidth={1.8} />}
      {children}
    </button>
  );
}
