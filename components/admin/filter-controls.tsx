'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Select estilizado com a paleta do admin (dark + accent lime). */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="default"
        className="h-9 w-full rounded-lg border-[#f3f0ed]/10 bg-[#141a1c] text-[#f3f0ed]/85 shadow-none transition-colors hover:border-[#f3f0ed]/20 hover:bg-[#f3f0ed]/[0.03] focus-visible:border-[#a2dd00]/50 focus-visible:ring-[3px] focus-visible:ring-[#a2dd00]/20 data-[placeholder]:text-[#f3f0ed]/40 [&_svg]:text-[#f3f0ed]/40"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="max-h-72 rounded-xl border-[#f3f0ed]/10 bg-[#1a2123] text-[#f3f0ed] shadow-xl"
      >
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="rounded-lg text-[#f3f0ed]/80 focus:bg-[#a2dd00]/15 focus:text-[#a2dd00] data-[state=checked]:font-medium data-[state=checked]:text-[#a2dd00] [&_svg]:text-[#a2dd00]"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Campo de filtro com label acima. */
export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#f3f0ed]/35">
        {label}
      </span>
      {children}
    </label>
  );
}
