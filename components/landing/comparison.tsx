"use client";

import { X, Check, ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";
import { useAuth } from "@/lib/auth-context";

const WITHOUT = [
  "Contratar modelo: R$500+",
  "Fotógrafo: R$800+",
  "Editor de vídeo: R$300+",
  "Tempo de produção: 3-5 dias",
  "Locação e logística",
];

const WITH = [
  "Influencer gerada em segundos",
  "Vídeo pronto em poucos cliques",
  "Edição automática com IA",
  "Conteúdo pronto em minutos",
  "Publique de qualquer lugar",
];

export function Comparison() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
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
            Por Que Geraew
          </span>
          <h2 className="mt-4 font-sora text-[26px] font-bold tracking-tight text-landing-text sm:mt-5 sm:text-3xl lg:text-[44px]">
            O jeito antigo custa caro. O jeito novo custa centavos.
          </h2>
        </div>

        {/* Cards */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2 lg:mt-20 lg:gap-6">
          {/* Without */}
          <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.04] p-5 sm:p-8">
            <h3 className="font-sora text-[17px] font-semibold text-landing-text">
              Sem Geraew
            </h3>
            <ul className="mt-5 space-y-3 sm:mt-7 sm:space-y-4">
              {WITHOUT.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                    <X className="h-3 w-3 text-red-400" />
                  </div>
                  <span className="text-[14px] text-landing-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-red-500/10 pt-5 sm:mt-8 sm:pt-6">
              <p className="font-sora text-[17px] font-bold text-landing-text">
                Total: R$1.600+ por sessão
              </p>
            </div>
          </div>

          {/* With */}
          <div className="rounded-2xl border border-landing-accent/20 bg-landing-accent/[0.04] p-5 sm:p-8">
            <h3 className="font-sora text-[17px] font-semibold text-landing-text">
              Com Geraew
            </h3>
            <ul className="mt-5 space-y-3 sm:mt-7 sm:space-y-4">
              {WITH.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-landing-accent/10">
                    <Check className="h-3 w-3 text-landing-accent" />
                  </div>
                  <span className="text-[14px] text-landing-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-landing-accent/15 pt-5 sm:mt-8 sm:pt-6">
              <p className="font-sora text-[17px] font-bold text-landing-accent">
                A partir de R$0/mês
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center sm:mt-14">
          <a
            href="/workspace"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            {isLoggedIn ? "Acessar Workspace" : "Economize agora — Testar Grátis"}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
