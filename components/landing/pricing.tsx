"use client";

import { Check, X, Shield, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";

/* TODO: AJUSTAR VALORES REAIS */
const PLANS = [
  {
    name: "Starter",
    price: "Grátis",
    period: null,
    credits: "X créditos para testar",
    popular: false,
    cta: "Começar Grátis",
    features: [
      { text: "Geração de imagens", ok: true },
      { text: "Acesso à galeria", ok: true },
      { text: "Suporte por email", ok: true },
      { text: "Marca d'água", ok: false },
    ],
  },
  {
    name: "Pro",
    price: "R$ 47",
    period: "/mês",
    credits: "X créditos/mês",
    popular: true,
    cta: "Assinar Pro",
    features: [
      { text: "Tudo do Starter", ok: true },
      { text: "Geração de vídeos", ok: true },
      { text: "Face Swap", ok: true },
      { text: "Sem marca d'água", ok: true },
      { text: "Prompts premium", ok: true },
      { text: "Suporte prioritário", ok: true },
    ],
  },
  {
    name: "Business",
    price: "R$ 97",
    period: "/mês",
    credits: "X créditos/mês",
    popular: false,
    cta: "Assinar Business",
    features: [
      { text: "Tudo do Pro", ok: true },
      { text: "Controle de movimento", ok: true },
      { text: "Créditos extras", ok: true },
      { text: "API access", ok: true },
      { text: "Suporte dedicado", ok: true },
    ],
  },
];

function PlanCard({ plan, i }: { plan: (typeof PLANS)[number]; i: number }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border p-7 transition-all duration-500 sm:p-8",
        plan.popular
          ? "z-10 scale-[1.03] border-landing-accent/40 bg-landing-card shadow-[0_0_60px_rgba(162,221,0,0.08)]"
          : "border-[#f3f0ed]/[0.06] bg-landing-card",
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? plan.popular ? "scale(1.03) translateY(0)" : "translateY(0)"
          : "translateY(32px)",
        transitionDelay: `${i * 120}ms`,
      }}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-landing-accent px-5 py-1 text-[11px] font-bold tracking-wide text-[#1a2123]">
          Mais Popular
        </div>
      )}

      {/* Plan name */}
      <h3 className="font-sora text-[17px] font-semibold text-landing-text">
        {plan.name}
      </h3>

      {/* Price */}
      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-sora text-[40px] font-bold leading-none text-landing-text">
          {plan.price}
        </span>
        {plan.period && (
          <span className="text-[14px] text-landing-text-muted">
            {plan.period}
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] text-landing-text-muted">
        {plan.credits}
      </p>

      {/* CTA */}
      <a
        href="https://app.geraew.com"
        className={cn(
          "mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold transition-all duration-300",
          plan.popular
            ? "bg-landing-accent text-[#1a2123] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
            : "border border-[#f3f0ed]/[0.08] text-landing-text hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.03]",
        )}
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </a>

      {/* Features */}
      <ul className="mt-8 space-y-3.5 border-t border-[#f3f0ed]/[0.04] pt-7">
        {plan.features.map((f) => (
          <li key={f.text} className="flex items-start gap-3">
            {f.ok ? (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-landing-accent/10">
                <Check className="h-3 w-3 text-landing-accent" />
              </div>
            ) : (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f3f0ed]/[0.04]">
                <X className="h-3 w-3 text-landing-text-muted" />
              </div>
            )}
            <span
              className={cn(
                "text-[14px]",
                f.ok
                  ? "text-landing-text-secondary"
                  : "text-landing-text-muted line-through",
              )}
            >
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pricing() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="precos" className="py-28 lg:py-36">
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
            Preços
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Planos simples. Sem surpresas.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-landing-text-secondary">
            Comece grátis e escale quando quiser. Cancele a qualquer momento.
          </p>
        </div>

        {/* Plans grid */}
        <div className="mt-16 grid grid-cols-1 items-start gap-5 md:grid-cols-3 lg:mt-20 lg:gap-6">
          {PLANS.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} i={i} />
          ))}
        </div>

        {/* Guarantee */}
        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card/60 p-8 text-center lg:mt-20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-landing-accent/15 bg-landing-accent/[0.08]">
            <Shield className="h-6 w-6 text-landing-accent" />
          </div>
          <h3 className="mt-5 font-sora text-lg font-semibold text-landing-text">
            Garantia de 7 Dias
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-landing-text-secondary">
            Experimente sem risco. Se não ficar satisfeito nos primeiros 7 dias,
            devolvemos 100% do seu dinheiro. Sem perguntas, sem burocracia.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-[13px] text-landing-text-muted">
            {[
              "Sem taxa de cancelamento",
              "Pagamento seguro",
              "Créditos renovam mensalmente",
            ].map((s) => (
              <span key={s} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-landing-accent" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
