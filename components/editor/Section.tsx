'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

export function Section({
  title,
  icon: Icon,
  done,
  children,
}: {
  title: string;
  icon: LucideIcon;
  done?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b border-[#f3f0ed]/[0.05] transition-all duration-200"
      style={{
        borderLeft: `2px solid ${open ? 'rgba(162,221,0,0.22)' : 'transparent'}`,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#f3f0ed]/[0.02]"
      >
        {/* Icon badge */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
          <Icon className="h-3.5 w-3.5 text-[#a2dd00]" />
        </div>

        <span className="flex-1 text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/55">
          {title}
        </span>

        {/* Done indicator */}
        {done && <div className="h-1.5 w-1.5 rounded-full bg-[#a2dd00] shadow-[0_0_6px_rgba(162,221,0,0.6)]" />}

        <ChevronDown
          className={`h-3.5 w-3.5 text-[#f3f0ed]/20 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className="px-4 pb-5">{children}</div>}
    </div>
  );
}
