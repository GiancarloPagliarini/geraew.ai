"use client";

import { Star, ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";

/* TODO: SUBSTITUIR POR DEPOIMENTOS REAIS */
const TESTIMONIALS = [
  {
    name: "Lucas Ferreira",
    handle: "@lucasferreira.ai",
    niche: "Criador de Conteúdo",
    text: "Em 2 semanas já tinha mais conteúdo pronto do que nos últimos 3 meses. A qualidade dos vídeos é absurda.",
    rating: 5,
  },
  {
    name: "Mariana Costa",
    handle: "@maricosta.digital",
    niche: "Afiliada Digital",
    text: "Meus reviews de produto com influencer virtual converteram 3x mais que os antigos. Não volto mais pro método tradicional.",
    rating: 5,
  },
  {
    name: "Rafael Souza",
    handle: "@rafasouza.mkt",
    niche: "Social Media",
    text: "Consigo entregar conteúdo pra 5 clientes diferentes sem precisar de equipe. A GeraEW mudou meu negócio.",
    rating: 5,
  },
  {
    name: "Camila Oliveira",
    handle: "@camilaoliveira.brand",
    niche: "Agência de Marketing",
    text: "Reduzimos o custo de produção em 80% e triplicamos o volume de criativos para nossos clientes.",
    rating: 5,
  },
];

function Card({ t, i }: { t: (typeof TESTIMONIALS)[number]; i: number }) {
  const { ref, isVisible } = useScrollReveal();
  const initials = t.name.split(" ").map((n) => n[0]).join("");

  return (
    <div
      ref={ref}
      className="rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-7 transition-all duration-500 sm:p-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      {/* Stars */}
      <div className="flex gap-1">
        {Array.from({ length: t.rating }).map((_, j) => (
          <Star
            key={j}
            className="h-4 w-4 fill-landing-accent text-landing-accent"
          />
        ))}
      </div>

      {/* Quote */}
      <p className="mt-5 text-[15px] leading-relaxed text-landing-text-secondary">
        &ldquo;{t.text}&rdquo;
      </p>

      {/* Author */}
      <div className="mt-7 flex items-center gap-3.5 border-t border-[#f3f0ed]/[0.04] pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-landing-accent/10 text-[13px] font-bold text-landing-accent ring-1 ring-landing-accent/20">
          {initials}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-landing-text">
            {t.name}
          </p>
          <p className="text-[12px] text-landing-text-muted">
            {t.handle} · {t.niche}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Testimonials() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="bg-landing-bg-secondary py-28 lg:py-36">
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
            O Que Dizem Sobre Nós
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Criadores reais. Resultados reais.
          </h2>
        </div>

        {/* Grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-20 lg:gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Card key={t.name} t={t} i={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 flex justify-center">
          <a
            href="https://app.geraew.com"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            Junte-se a eles — Começar Grátis
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
