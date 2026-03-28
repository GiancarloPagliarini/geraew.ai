import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border p-4 md:p-5 ${accent
          ? 'border-[#a2dd00]/20 bg-[#a2dd00]/5'
          : 'border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]'
        }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-bold uppercase tracking-widest md:text-[10px] md:tracking-[0.12em] ${accent ? 'text-[#a2dd00]/50' : 'text-[#f3f0ed]/30'
            }`}
        >
          {label}
        </span>
        <div className="flex items-center gap-2">
          {children}
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg md:h-8 md:w-8 ${accent ? 'bg-[#a2dd00]/10' : 'bg-[#f3f0ed]/5'
              }`}
          >
            <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${accent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40'}`} />
          </div>
        </div>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums md:mt-3 md:text-3xl ${accent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[#f3f0ed]/30">{sub}</p>}
    </div>
  );
}
