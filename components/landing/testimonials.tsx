"use client";

import { useTranslations } from "next-intl";
import { Star, ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";
import { useAuth } from "@/lib/auth-context";

interface TestimonialItem {
  name: string;
  handle: string;
  niche: string;
  text: string;
}

function Card({ item, i }: { item: TestimonialItem; i: number }) {
  const { ref, isVisible } = useScrollReveal();
  const initials = item.name.split(" ").map((n) => n[0]).join("");

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-5 transition-all duration-500 sm:p-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      {/* Stars */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, j) => (
          <Star
            key={j}
            className="h-4 w-4 fill-landing-accent text-landing-accent"
          />
        ))}
      </div>

      {/* Quote */}
      <p className="mt-4 text-[14px] leading-relaxed text-landing-text-secondary sm:mt-5 sm:text-[15px]">
        &ldquo;{item.text}&rdquo;
      </p>

      {/* Author */}
      <div className="mt-5 flex items-center gap-3.5 border-t border-[#f3f0ed]/[0.04] pt-4 sm:mt-7 sm:pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-landing-accent/10 text-[13px] font-bold text-landing-accent ring-1 ring-landing-accent/20">
          {initials}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-landing-text">
            {item.name}
          </p>
          <p className="text-[12px] text-landing-text-muted">
            {item.handle} · {item.niche}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const t = useTranslations("testimonials");
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { ref, isVisible } = useScrollReveal();

  const items = t.raw("items") as TestimonialItem[];

  return (
    <section className="bg-landing-bg-secondary py-16 sm:py-28 lg:py-36">
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

        {/* Grid */}
        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:mt-20 lg:gap-6">
          {items.map((item, i) => (
            <Card key={item.name} item={item} i={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center sm:mt-14">
          <a
            href="/workspace"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-landing-bg-secondary shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-colors duration-200 hover:bg-[#b5e82d] active:scale-[0.98]"
          >
            {isLoggedIn ? t("ctaLoggedIn") : t("cta")}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
