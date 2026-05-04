"use client";

import { User, Video, Move3d, ScanFace, BookOpen, Zap, MicVocal, AudioLines } from "lucide-react";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "./use-scroll-reveal";

const FEATURE_META = [
  { icon: User, key: "influencers" },
  { icon: Video, key: "videos" },
  { icon: AudioLines, key: "audio" },
  { icon: MicVocal, key: "voiceClone" },
  { icon: Move3d, key: "motion" },
  { icon: ScanFace, key: "faceSwap" },
  { icon: BookOpen, key: "prompts" },
  { icon: Zap, key: "speed" },
] as const;

function Card({
  f,
  i,
  title,
  desc,
}: {
  f: (typeof FEATURE_META)[number];
  i: number;
  title: string;
  desc: string;
}) {
  const { ref, isVisible } = useScrollReveal();
  const Icon = f.icon;

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-5 transition-all duration-500 hover:border-landing-accent/15 hover:shadow-[0_0_40px_rgba(162,221,0,0.06)] sm:p-7"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 80}ms`,
      }}
    >
      <div className="mb-4 flex h-11 w-11 sm:mb-5 items-center justify-center rounded-xl border border-landing-accent/15 bg-landing-accent/[0.08] transition-colors duration-400 group-hover:bg-landing-accent/[0.14]">
        <Icon className="h-5 w-5 text-landing-accent" />
      </div>
      <h3 className="font-sora text-[17px] font-semibold text-landing-text">
        {title}
      </h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-landing-text-secondary">
        {desc}
      </p>
    </div>
  );
}

export function Features() {
  const { ref, isVisible } = useScrollReveal();
  const t = useTranslations("features");

  return (
    <section id="funcionalidades" className="bg-landing-bg-secondary py-16 sm:py-28 lg:py-36">
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
          <p className="mt-3.5 text-[15px] leading-relaxed text-landing-text-secondary sm:mt-5 sm:text-[17px]">
            {t("subtitle")}
          </p>
        </div>

        {/* Grid */}
        <div className="mt-10 grid grid-cols-1 gap-3.5 sm:mt-16 sm:gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6">
          {FEATURE_META.map((f, i) => (
            <Card
              key={f.key}
              f={f}
              i={i}
              title={t(`items.${f.key}.title`)}
              desc={t(`items.${f.key}.description`)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
