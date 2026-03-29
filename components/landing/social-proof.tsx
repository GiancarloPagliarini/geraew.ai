"use client";

import { useCountUp } from "./use-count-up";
import { Star } from "lucide-react";

/* TODO: SUBSTITUIR POR NÚMEROS REAIS */
const STATS = [
  { value: 2000, label: "Criadores Ativos", prefix: "+" },
  { value: 50000, label: "Imagens Geradas", prefix: "+" },
  { value: 5000, label: "Vídeos Criados", prefix: "+" },
  { value: 49, label: "Avaliação Média", isRating: true },
] as const;

function Stat({
  value,
  label,
  prefix,
  isRating,
}: {
  value: number;
  label: string;
  prefix?: string;
  isRating?: boolean;
}) {
  const { ref, count } = useCountUp(value);
  const display = isRating
    ? (count / 10).toFixed(1)
    : count.toLocaleString("pt-BR");

  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        {isRating && (
          <Star className="h-5 w-5 fill-landing-accent text-landing-accent" />
        )}
        <span className="font-sora text-[24px] font-bold tabular-nums text-landing-text sm:text-[32px]">
          {!isRating && prefix}
          {display}
        </span>
      </div>
      <span className="text-[13px] font-medium tracking-wide text-landing-text-muted">
        {label}
      </span>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="relative border-y border-[#f3f0ed]/[0.04] bg-landing-bg-secondary py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-5 sm:gap-10 md:flex md:items-center md:justify-center md:gap-16 lg:gap-20">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
