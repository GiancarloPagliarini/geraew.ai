"use client";

import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";

const INITIALS = ["LF", "MC", "RS", "CO", "JP", "AS"];

export function FinalCta() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="landing-noise relative overflow-hidden py-28 lg:py-36">
      {/* Background gradient — lime glow from top */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(162,221,0,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <div
          ref={ref}
          className="mx-auto flex max-w-[680px] flex-col items-center text-center transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(28px)",
          }}
        >
          {/* Stacked avatars */}
          <div className="mb-10 flex items-center">
            <div className="flex -space-x-2.5">
              {INITIALS.map((init, i) => (
                <div
                  key={init}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-landing-bg bg-landing-accent/15 text-[11px] font-bold text-landing-accent ring-1 ring-landing-accent/20"
                  style={{ zIndex: INITIALS.length - i }}
                >
                  {init}
                </div>
              ))}
            </div>
            {/* TODO: SUBSTITUIR POR NÚMERO REAL */}
            <span className="ml-4 text-[13px] font-medium text-landing-text-muted">
              +2.000 criadores já estão usando
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[48px] lg:leading-[1.1]">
            Pronto para criar seu primeiro influencer digital?
          </h2>

          {/* Sub */}
          <p className="mt-6 text-[17px] leading-relaxed text-landing-text-secondary">
            Junte-se a milhares de criadores que já estão transformando ideias em
            conteúdo profissional com inteligência artificial.
          </p>

          {/* CTA */}
          <a
            href="https://app.geraew.com"
            className="landing-glow-pulse group mt-10 inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-9 py-4 text-[15px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.03] hover:brightness-110"
          >
            Começar Grátis
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>

          {/* Microcopy */}
          <p className="mt-5 text-[13px] tracking-wide text-landing-text-muted">
            Sem cartão de crédito · Setup em 2 minutos · Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
}
