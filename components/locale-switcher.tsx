"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const LABELS: Record<Locale, { flag: string; code: string }> = {
  "pt-BR": { flag: "🇧🇷", code: "PT" },
  en: { flag: "🇺🇸", code: "EN" },
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
};

const LOCALE_CURRENCY: Record<Locale, string> = {
  "pt-BR": "BRL",
  en: "USD",
};

export function LocaleSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const t = useTranslations("locale");
  const { user, accessToken } = useAuth();

  function handleChange(next: Locale) {
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

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 bg-landing-bg/40 p-0.5",
        compact
          ? "rounded-lg border border-landing-text/6"
          : "rounded-xl border border-landing-text/8",
        className,
      )}
      role="group"
      aria-label={t("portuguese") + " / " + t("english")}
    >
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => handleChange(l)}
            disabled={pending}
            className={cn(
              "flex items-center rounded-md transition-all",
              compact
                ? "px-2 py-0.5 text-[10px] gap-1"
                : "px-2.5 py-1.5 text-[11px] gap-1.5 rounded-lg",
              active
                ? "bg-[#f3f0ed]/[0.08] rounded-lg text-[#f3f0ed]"
                : "text-[#f3f0ed]/40 hover:text-[#f3f0ed]/80",
              pending && "opacity-60",
            )}
            aria-pressed={active}
          >
            {compact ? (
              (() => { const Flag = FLAG_SVG[l]; return <Flag className="w-4.5  rounded-[2px]" />; })()
            ) : (
              <span>{LABELS[l].flag}</span>
            )}
            {!compact && <span>{LABELS[l].code}</span>}
          </button>
        );
      })}
    </div>
  );
}
