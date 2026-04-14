"use client";

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

const LOCALE_CURRENCY: Record<Locale, string> = {
  "pt-BR": "BRL",
  en: "USD",
};

export function LocaleSwitcher({ className }: { className?: string }) {
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
        .catch(() => {});
    }
    startTransition(() => {
      setLocale(next);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-[#f3f0ed]/[0.08] bg-[#141a1c]/40 p-0.5",
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
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
              active
                ? "bg-[#f3f0ed]/[0.08] text-[#f3f0ed]"
                : "text-[#f3f0ed]/40 hover:text-[#f3f0ed]/80",
              pending && "opacity-60",
            )}
            aria-pressed={active}
          >
            <span>{LABELS[l].flag}</span>
            <span>{LABELS[l].code}</span>
          </button>
        );
      })}
    </div>
  );
}
