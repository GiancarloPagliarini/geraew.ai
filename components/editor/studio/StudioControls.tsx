'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function StudioPill({
  children,
  icon,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
          : 'bg-[#f3f0ed]/[0.04] text-[#f3f0ed]/75 hover:text-[#f3f0ed]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export interface StudioSelectOption {
  value: string;
  label: string;
  suffix?: string;
  disabled?: boolean;
}

export function StudioSelectPill({
  value,
  label,
  options,
  onChange,
  icon,
  disabled,
}: {
  value: string;
  label: string;
  options: StudioSelectOption[];
  onChange: (next: string) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 6 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onScroll() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ left: rect.left, bottom: window.innerHeight - rect.top + 6 });
    }
    document.addEventListener('mousedown', onClickOutside, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onClickOutside, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
          open
            ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
            : 'bg-[#f3f0ed]/[0.04] text-[#f3f0ed]/75 hover:text-[#f3f0ed]'
        }`}
      >
        {icon}
        {label}
        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, zIndex: 9999 }}
          className="flex min-w-[160px] flex-col gap-0.5 rounded-xl bg-[#1a2123] p-1 shadow-2xl"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              onClick={() => { if (opt.disabled) return; onChange(opt.value); setOpen(false); }}
              className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                opt.value === value
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                  : 'text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.suffix && <span className="font-mono text-[10px] opacity-60">{opt.suffix}</span>}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
