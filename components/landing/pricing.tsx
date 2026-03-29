"use client";

import { Check, Shield, ArrowRight, Lock, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, Plan } from "@/lib/api";
import {
  PLAN_ORDER,
  PLAN_SUBTITLES,
  PLAN_GENERATIONS,
  formatPrice,
  getPlanFeatures,
} from "@/lib/plans";

function PlanCard({ plan, i, total }: { plan: Plan; i: number; total: number }) {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { ref, isVisible } = useScrollReveal();
  const isPopular = plan.slug === "creator";
  const isFree = plan.priceCents === 0;
  const { main, sub } = formatPrice(plan.priceCents);
  const features = getPlanFeatures(plan);
  const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];
  const subtitle = PLAN_SUBTITLES[plan.slug];

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col rounded-[20px] border transition-all duration-600",
        isPopular
          ? "border-landing-accent/30 bg-[#1a2523]"
          : "border-[#f3f0ed]/[0.05] bg-[#171e20] hover:border-[#f3f0ed]/[0.1]",
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(36px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      {/* Popular glow effect */}
      {isPopular && (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-[20px] opacity-60"
            style={{
              background:
                "linear-gradient(180deg, rgba(162,221,0,0.12) 0%, rgba(162,221,0,0) 40%)",
            }}
          />
          <div
            className="pointer-events-none absolute -top-[1px] left-6 right-6 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(162,221,0,0.5), transparent)",
            }}
          />
        </>
      )}

      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-landing-accent px-4 py-1 shadow-[0_0_20px_rgba(162,221,0,0.3)]">
            <Sparkles className="h-3 w-3 text-[#141a1c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#141a1c]">
              Mais Popular
            </span>
          </div>
        </div>
      )}

      {/* Card inner */}
      <div className="relative flex flex-1 flex-col p-5 sm:p-7">
        {/* Plan header */}
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-sora text-[16px] font-bold text-[#f3f0ed]">
              {plan.name}
            </h3>
            {subtitle && (
              <span className="rounded-md bg-[#f3f0ed]/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#f3f0ed]/40">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Credits — hero number */}
        <div className="mt-5">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-sora text-[36px] font-extrabold leading-none tracking-tight sm:text-[44px]",
                isPopular ? "text-landing-accent" : "text-[#f3f0ed]",
              )}
            >
              {isFree
                ? plan.creditsPerMonth
                : plan.creditsPerMonth.toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#f3f0ed]/35">
            créditos{isFree ? " para testar" : " por mês"}
          </p>
        </div>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-1">
          <span
            className={cn(
              "text-[20px] font-bold",
              isFree ? "text-landing-accent" : "text-[#f3f0ed]/80",
            )}
          >
            {main}
          </span>
          {sub && (
            <span className="text-[13px] text-[#f3f0ed]/30">{sub}</span>
          )}
        </div>

        {/* Divider */}
        <div className="my-6 h-px w-full bg-[#f3f0ed]/[0.05]" />

        {/* Features */}
        <ul className="flex min-h-[140px] flex-col gap-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <div
                className={cn(
                  "mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                  isPopular
                    ? "bg-landing-accent/15"
                    : "bg-[#f3f0ed]/[0.06]",
                )}
              >
                <Check
                  className={cn(
                    "h-2.5 w-2.5",
                    isPopular ? "text-landing-accent" : "text-[#f3f0ed]/50",
                  )}
                />
              </div>
              <span className="text-[13px] leading-snug text-[#f3f0ed]/60">
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* Generation examples */}
        {generationExamples.length > 0 && (
          <div className="mt-6">
            <div className="rounded-xl bg-[#f3f0ed]/[0.02] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/25">
                Estimativa de gerações
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {generationExamples.map((ex) => (
                  <div
                    key={ex.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[11px] text-[#f3f0ed]/40">
                      {ex.label}
                    </span>
                    {ex.blocked ? (
                      <span className="flex items-center gap-1 text-[11px] text-red-400/40">
                        <Lock className="h-2.5 w-2.5" />
                        bloqueado
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#f3f0ed]/60">
                        {ex.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[9px] text-[#f3f0ed]/15">
                Usando todos os créditos em um único modelo
              </p>
            </div>
          </div>
        )}

        {/* Spacer to push CTA to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        <a
          href={isFree ? "/workspace" : "/login"}
          className={cn(
            "mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-bold transition-all duration-300",
            isPopular
              ? "bg-landing-accent text-[#141a1c] shadow-[0_0_0_1px_rgba(162,221,0,0.3)] hover:shadow-[0_0_28px_rgba(162,221,0,0.25)] hover:brightness-110"
              : isFree
                ? "bg-[#f3f0ed]/[0.06] text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/[0.1] hover:text-[#f3f0ed]"
                : "border border-[#f3f0ed]/[0.08] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.03] hover:text-[#f3f0ed]",
          )}
        >
          {isLoggedIn ? "Acessar Workspace" : isFree ? "Começar Grátis" : `Assinar ${plan.name}`}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export function Pricing() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { ref, isVisible } = useScrollReveal();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.plans
      .listPublic()
      .then((data) => {
        const sorted = data
          .slice()
          .sort(
            (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
          );
        setPlans(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="precos" className="relative py-16 sm:py-28 lg:py-36">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(162,221,0,0.03) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
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
          <h2 className="mt-4 font-sora text-[26px] font-bold tracking-tight text-landing-text sm:mt-5 sm:text-3xl lg:text-[44px]">
            Planos simples. Sem surpresas.
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-landing-text-secondary sm:mt-5 sm:text-[17px]">
            Comece grátis e escale quando quiser. Cancele a qualquer momento.
          </p>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="mt-16 flex justify-center lg:mt-20">
            <Loader2 className="h-6 w-6 animate-spin text-landing-accent" />
          </div>
        ) : (
          <div className="mt-10 sm:mt-16 lg:mt-20">
            {/* Mobile / Tablet: grid */}
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:hidden">
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  i={i}
                  total={plans.length}
                />
              ))}
            </div>

            {/* Desktop: fan / deck layout */}
            <div className="hidden lg:flex lg:items-start lg:justify-center lg:pt-16 lg:pb-12">
              {plans.map((plan, i) => {
                const center = Math.floor(plans.length / 2);
                const offset = i - center;
                const absOffset = Math.abs(offset);
                const rotation = offset * 5;
                const yShift = absOffset * absOffset * 14;
                const scale = 1 - absOffset * 0.05;
                const z = 10 - absOffset;
                const brightness = 1 - absOffset * 0.04;

                return (
                  <div
                    key={plan.id}
                    className="w-[256px] shrink-0"
                    style={{
                      transform: `rotate(${rotation}deg) translateY(${yShift}px) scale(${scale})`,
                      transformOrigin: 'bottom center',
                      zIndex: z,
                      marginLeft: i === 0 ? 0 : '-14px',
                      filter: absOffset > 0 ? `brightness(${brightness})` : undefined,
                    }}
                  >
                    <div className="transition-all duration-300 hover:-translate-y-3 hover:scale-[1.03]">
                      <PlanCard
                        plan={plan}
                        i={i}
                        total={plans.length}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Guarantee */}
        <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20">
          <div className="rounded-[20px] border border-[#f3f0ed]/[0.05] bg-[#171e20] p-5 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-landing-accent/15 bg-landing-accent/[0.06]">
              <Shield className="h-5 w-5 text-landing-accent" />
            </div>
            <h3 className="mt-5 font-sora text-lg font-bold text-[#f3f0ed]">
              Garantia de 7 Dias
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-[#f3f0ed]/50">
              Experimente sem risco. Se não ficar satisfeito nos primeiros 7
              dias, devolvemos 100% do seu dinheiro. Sem perguntas, sem
              burocracia.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:mt-7 sm:gap-x-6 sm:gap-y-2.5">
              {[
                "Sem taxa de cancelamento",
                "Pagamento seguro",
                "Créditos renovam mensalmente",
              ].map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-2 text-[12px] text-[#f3f0ed]/35"
                >
                  <Check className="h-3 w-3 text-landing-accent/60" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
