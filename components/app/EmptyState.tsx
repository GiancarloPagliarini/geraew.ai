'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  cta?: { label: string; href: string };
  className?: string;
}

/** Estado vazio/erro padrão do app shell: tile + título + dica + CTA opcional. */
export function EmptyState({ icon: Icon, title, hint, cta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[14px] border border-app-hairline bg-app-card px-6 py-14 text-center',
        className,
      )}
    >
      <span className="flex size-[52px] items-center justify-center rounded-[14px] border border-app-hairline bg-app-bg">
        <Icon className="size-6 text-app-text-2" strokeWidth={1.8} />
      </span>
      <p className="text-[15px] font-semibold text-app-text">{title}</p>
      {hint && <p className="text-[13.5px] text-app-text-2">{hint}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="text-[14px] font-semibold text-app-lime transition-colors duration-200 ease-app hover:text-app-lime-bright"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
