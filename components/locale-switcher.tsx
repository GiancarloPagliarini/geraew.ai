"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const LABELS: Record<Locale, { flag: string; code: string }> = {
  "pt-BR": { flag: "🇧🇷", code: "PT" },
  en: { flag: "🇺🇸", code: "EN" },
  es: { flag: "🇪🇸", code: "ES" },
};

function FlagBR({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" className={className}>
      <rect width="20" height="14" rx="2" fill="#009c3b" />
      <polygon points="10,1.5 18.5,7 10,12.5 1.5,7" fill="#fedf00" />
      <circle cx="10" cy="7" r="3.2" fill="#002776" />
      <path d="M7.1 8.1 a3.2 3.2 0 0 0 5.8 0" fill="none" stroke="#fff" strokeWidth="0.7" />
      <line x1="7.2" y1="6.5" x2="12.8" y2="6.5" stroke="#fff" strokeWidth="0.6" />
    </svg>
  );
}

function FlagES({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" className={className}>
      <rect width="20" height="14" rx="2" fill="#AA151B" />
      <rect width="20" height="7" y="3.5" fill="#F1BF00" />
    </svg>
  );
}

function FlagUS({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 14" className={className}>
      <rect width="20" height="14" rx="2" fill="#fff" />
      <rect width="20" height="1.08" y="0" fill="#B22234" />
      <rect width="20" height="1.08" y="2.15" fill="#B22234" />
      <rect width="20" height="1.08" y="4.31" fill="#B22234" />
      <rect width="20" height="1.08" y="6.46" fill="#B22234" />
      <rect width="20" height="1.08" y="8.62" fill="#B22234" />
      <rect width="20" height="1.08" y="10.77" fill="#B22234" />
      <rect width="20" height="1.08" y="12.92" fill="#B22234" />
      <rect width="8" height="7.54" rx="2" fill="#3C3B6E" />
      <g fill="#fff">
        <circle cx="1.3" cy="1.2" r="0.5" /><circle cx="2.7" cy="1.2" r="0.5" /><circle cx="4.0" cy="1.2" r="0.5" /><circle cx="5.4" cy="1.2" r="0.5" /><circle cx="6.7" cy="1.2" r="0.5" />
        <circle cx="2.0" cy="2.4" r="0.5" /><circle cx="3.3" cy="2.4" r="0.5" /><circle cx="4.7" cy="2.4" r="0.5" /><circle cx="6.0" cy="2.4" r="0.5" />
        <circle cx="1.3" cy="3.6" r="0.5" /><circle cx="2.7" cy="3.6" r="0.5" /><circle cx="4.0" cy="3.6" r="0.5" /><circle cx="5.4" cy="3.6" r="0.5" /><circle cx="6.7" cy="3.6" r="0.5" />
        <circle cx="2.0" cy="4.8" r="0.5" /><circle cx="3.3" cy="4.8" r="0.5" /><circle cx="4.7" cy="4.8" r="0.5" /><circle cx="6.0" cy="4.8" r="0.5" />
        <circle cx="1.3" cy="6.0" r="0.5" /><circle cx="2.7" cy="6.0" r="0.5" /><circle cx="4.0" cy="6.0" r="0.5" /><circle cx="5.4" cy="6.0" r="0.5" /><circle cx="6.7" cy="6.0" r="0.5" />
      </g>
    </svg>
  );
}

const FLAG_SVG: Record<Locale, (props: { className?: string }) => React.JSX.Element> = {
  "pt-BR": FlagBR,
  en: FlagUS,
  es: FlagES,
};

const LOCALE_CURRENCY: Record<Locale, string> = {
  "pt-BR": "BRL",
  en: "USD",
  es: "USD",
};

export function LocaleSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("locale");
  const { user, accessToken } = useAuth();

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleChange(next: Locale) {
    setOpen(false);
    if (next === locale || pending) return;
    if (user && accessToken) {
      api.users
        .updateProfile(accessToken, {
          locale: next,
          currency: LOCALE_CURRENCY[next],
        })
        .catch(() => { });
    }
    startTransition(() => {
      setLocale(next);
    });
  }

  const ActiveFlag = FLAG_SVG[locale];

  if (compact) {
    return (
      <div
        className={cn("inline-flex items-center", className)}
        aria-label={LABELS[locale].code}
      >
        <ActiveFlag className="w-5 rounded-[2px]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={LABELS[locale].code}
        className={cn(
          "flex items-center bg-landing-bg/40 transition-all",
          compact
            ? "rounded-lg border border-landing-text/6 px-2 py-1 text-[10px] gap-1"
            : "rounded-xl border border-landing-text/8 px-2.5 py-1.5 text-[11px] gap-1.5",
          "text-[#f3f0ed] hover:bg-[#f3f0ed]/[0.06]",
          pending && "opacity-60",
        )}
      >
        <ActiveFlag className={cn("rounded-[2px]", compact ? "w-4" : "w-4.5")} />
        {!compact && <span>{LABELS[locale].code}</span>}
        <ChevronDown
          className={cn(
            "shrink-0 text-[#f3f0ed]/50 transition-transform",
            compact ? "h-3 w-3" : "h-3.5 w-3.5",
            open && "rotate-180",
          )}
        />
      </button>

      {open && menuPos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={t("portuguese") + " / " + t("english")}
          style={{ top: menuPos.top, right: menuPos.right }}
          className={cn(
            "fixed z-[9999] min-w-[8rem] overflow-hidden rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60",
          )}
        >
          {locales.map((l) => {
            const active = l === locale;
            const FlagComp = FLAG_SVG[l];
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleChange(l)}
                disabled={pending}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all",
                  active
                    ? "bg-[#f3f0ed]/[0.08] text-[#f3f0ed]"
                    : "text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/[0.05] hover:text-[#f3f0ed]",
                )}
              >
                <FlagComp className="w-4.5 shrink-0 rounded-[2px]" />
                <span className="font-medium">{LABELS[l].code}</span>
                {active && <span className="ml-auto text-[10px] text-[#a2dd00]">✓</span>}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
