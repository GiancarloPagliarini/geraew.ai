"use client";

import { User, Video, Move3d, ScanFace, BookOpen, Zap } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";

const FEATURES = [
  {
    icon: User,
    title: "Criação de Influencers",
    desc: "Gere personas únicas com qualidade de estúdio profissional. Cada detalhe — pele, expressão, iluminação — é pensado para parecer real.",
  },
  {
    icon: Video,
    title: "Vídeos Ultra-Realistas",
    desc: "Transforme qualquer imagem em vídeo com movimentos naturais. Pronto para Reels, TikTok e Stories em poucos segundos.",
  },
  {
    icon: Move3d,
    title: "Controle de Movimento",
    desc: "Copie o movimento de qualquer vídeo de referência e aplique na sua persona. Danças, gestos, expressões — com um clique.",
  },
  {
    icon: ScanFace,
    title: "Face Swap",
    desc: "Troque rostos em qualquer imagem ou vídeo. Perfeito para reviews de produto, UGC e criativos para anúncios.",
  },
  {
    icon: BookOpen,
    title: "Biblioteca de Prompts",
    desc: "Acesse centenas de prompts prontos por nicho. Moda, fitness, beleza, finanças, tech — é só escolher e gerar.",
  },
  {
    icon: Zap,
    title: "Velocidade Absurda",
    desc: "Da ideia ao conteúdo pronto em segundos. Sem fila de espera, sem processamento lento. Pensou, criou.",
  },
];

function Card({ f, i }: { f: (typeof FEATURES)[number]; i: number }) {
  const { ref, isVisible } = useScrollReveal();
  const Icon = f.icon;

  return (
    <div
      ref={ref}
      className="group rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-7 transition-all duration-500 hover:border-landing-accent/15 hover:shadow-[0_0_40px_rgba(162,221,0,0.06)]"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(28px)",
        transitionDelay: `${i * 80}ms`,
      }}
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-landing-accent/15 bg-landing-accent/[0.08] transition-colors duration-400 group-hover:bg-landing-accent/[0.14]">
        <Icon className="h-5 w-5 text-landing-accent" />
      </div>
      <h3 className="font-sora text-[17px] font-semibold text-landing-text">
        {f.title}
      </h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-landing-text-secondary">
        {f.desc}
      </p>
    </div>
  );
}

export function Features() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="funcionalidades" className="bg-landing-bg-secondary py-28 lg:py-36">
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
            Tudo Que Você Precisa
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Uma plataforma completa para criar conteúdo que converte.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-landing-text-secondary">
            Fotos, vídeos, movimentos e edição — tudo com inteligência
            artificial, tudo em um só lugar.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-6">
          {FEATURES.map((f, i) => (
            <Card key={f.title} f={f} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
