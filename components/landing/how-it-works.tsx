"use client";

import { Sparkles, SlidersHorizontal, Download, ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";

const STEPS = [
  {
    num: "01",
    icon: Sparkles,
    title: "Crie sua Influencer",
    desc: "Escolha um modelo da galeria ou gere uma persona totalmente nova. Defina rosto, corpo, estilo e personalidade em poucos cliques.",
  },
  {
    num: "02",
    icon: SlidersHorizontal,
    title: "Personalize o Conteúdo",
    desc: "Escolha cenário, pose, roupa e movimento. Use prompts prontos ou escreva o seu. Controle total sobre cada detalhe.",
  },
  {
    num: "03",
    icon: Download,
    title: "Exporte e Publique",
    desc: "Baixe em alta qualidade, pronto para TikTok, Instagram, YouTube ou qualquer rede. Sem marca d'água nos planos pagos.",
  },
];

function Step({ step, i }: { step: (typeof STEPS)[number]; i: number }) {
  const { ref, isVisible } = useScrollReveal();
  const Icon = step.icon;

  return (
    <div
      ref={ref}
      className="group relative flex flex-col transition-all duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(32px)",
        transitionDelay: `${i * 150}ms`,
      }}
    >
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-7 transition-all duration-500 hover:border-landing-accent/15 hover:shadow-[0_0_40px_rgba(162,221,0,0.06)] sm:p-8">
        {/* Large decorative number */}
        <span className="pointer-events-none absolute -top-3 -left-1 font-sora text-[80px] font-extrabold leading-none text-landing-accent/[0.06] select-none">
          {step.num}
        </span>

        {/* Icon */}
        <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-landing-accent/15 bg-landing-accent/[0.08] transition-colors duration-500 group-hover:bg-landing-accent/[0.12]">
          <Icon className="h-5 w-5 text-landing-accent" />
        </div>

        {/* Content */}
        <h3 className="relative font-sora text-lg font-semibold text-landing-text">
          {step.title}
        </h3>
        <p className="relative mt-2.5 text-[15px] leading-relaxed text-landing-text-secondary">
          {step.desc}
        </p>

        {/* Placeholder visual */}
        <div className="relative mt-7 aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#f3f0ed]/[0.04] bg-landing-bg-secondary">
          {/* TODO: SUBSTITUIR POR SCREENSHOT/GIF REAL */}
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-landing-accent/10" />
              <div className="h-1.5 w-20 rounded-full bg-[#f3f0ed]/[0.05]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-28 lg:py-36">
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
            Simples Assim
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Do zero ao conteúdo pronto em 3 passos.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-landing-text-secondary">
            Você não precisa de experiência com IA, edição ou design. A GeraEW
            faz o trabalho pesado por você.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16 lg:mt-20">
          {/* Dashed connector (desktop) */}
          <div className="absolute top-[160px] hidden h-px w-full md:block">
            <div className="mx-auto w-2/3 border-t border-dashed border-[#f3f0ed]/[0.06]" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-7">
            {STEPS.map((step, i) => (
              <Step key={step.num} step={step} i={i} />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 flex justify-center">
          <a
            href="https://app.geraew.com"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            Quero criar minha primeira influencer
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
