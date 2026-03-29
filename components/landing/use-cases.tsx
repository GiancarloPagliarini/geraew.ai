"use client";

import { useScrollReveal } from "./use-scroll-reveal";

const CASES = [
  {
    emoji: "🎬",
    title: "Criadores de Conteúdo",
    desc: "Publique todos os dias sem mostrar o rosto. Crie uma persona que vira a identidade do seu canal e construa audiência real com conteúdo gerado por IA.",
  },
  {
    emoji: "🛒",
    title: "Vendedores e Afiliados",
    desc: "Gere vídeos de review, unboxing e demonstração com influencers virtuais. Escale vendas no TikTok Shop, Instagram e qualquer plataforma sem depender de ninguém.",
  },
  {
    emoji: "🏢",
    title: "Marcas e Agências",
    desc: "Produza UGC ilimitado sem contratar modelos ou influencers. Reduza custos de produção e tenha criativos novos todos os dias para campanhas.",
  },
  {
    emoji: "📱",
    title: "Social Media Managers",
    desc: "Entregue mais resultados com menos tempo e custo. Crie conteúdo para múltiplas marcas usando personas diferentes para cada uma.",
  },
];

function Card({ c, i }: { c: (typeof CASES)[number]; i: number }) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-7 transition-all duration-500 hover:border-landing-accent/15 hover:shadow-[0_0_40px_rgba(162,221,0,0.06)] sm:p-8"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      <span className="text-[28px]">{c.emoji}</span>
      <h3 className="mt-5 font-sora text-[17px] font-semibold text-landing-text">
        {c.title}
      </h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-landing-text-secondary">
        {c.desc}
      </p>
    </div>
  );
}

export function UseCases() {
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
            Para Quem É
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Não importa seu nicho. A GeraEW se adapta ao seu objetivo.
          </h2>
        </div>

        {/* Cards */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-20 lg:gap-6">
          {CASES.map((c, i) => (
            <Card key={c.title} c={c} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
