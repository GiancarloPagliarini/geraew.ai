"use client";

import { useTranslations } from "next-intl";
import { Clapperboard, ShoppingCart, Building2, Smartphone, LucideIcon } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";

const CASES: { icon: LucideIcon; key: "creators" | "sellers" | "brands" | "social" }[] = [
  { icon: Clapperboard, key: "creators" },
  { icon: ShoppingCart, key: "sellers" },
  { icon: Building2, key: "brands" },
  { icon: Smartphone, key: "social" },
];

function Card({
  icon: Icon,
  title,
  desc,
  i,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  i: number;
}) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-5 transition-all duration-500 hover:border-landing-accent/15 hover:shadow-[0_0_40px_rgba(162,221,0,0.06)] sm:p-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-landing-accent/10 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 text-landing-accent sm:h-6 sm:w-6" />
      </div>
      <h3 className="mt-3.5 font-sora text-[16px] sm:mt-5 sm:text-[17px] font-semibold text-landing-text">
        {title}
      </h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-landing-text-secondary">
        {desc}
      </p>
    </div>
  );
}

export function UseCases() {
  const t = useTranslations("useCases");
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div
          ref={ref}
          className="mx-auto max-w-2xl text-center transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-landing-accent">
            {t("tag")}
          </span>
          <h2 className="mt-4 font-sora text-[26px] font-bold tracking-tight text-landing-text sm:mt-5 sm:text-3xl lg:text-[44px]">
            {t("title")}
          </h2>
        </div>

        {/* Cards */}
        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:mt-20 lg:gap-6">
          {CASES.map((c, i) => (
            <Card
              key={c.key}
              icon={c.icon}
              title={t(`items.${c.key}.title`)}
              desc={t(`items.${c.key}.desc`)}
              i={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
