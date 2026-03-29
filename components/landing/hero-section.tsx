import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="landing-noise relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32 lg:pt-48 lg:pb-40">
      {/* Radial glow — lime energy from top */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -5%, rgba(162,221,0,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Secondary glow — softer, wider */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 20%, rgba(162,221,0,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
          {/* Badge */}
          <div className="landing-shimmer mb-8 inline-flex items-center gap-2 rounded-full border border-landing-accent/20 bg-landing-accent/[0.07] px-4 py-1.5">
            <span className="text-[13px] font-medium text-landing-accent">
              ✦ Plataforma de criação com Inteligência Artificial
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-sora text-[40px] leading-[1.08] font-extrabold tracking-tight text-landing-text sm:text-[56px] lg:text-[68px]">
            Crie influencers digitais com IA e domine qualquer plataforma.
          </h1>

          {/* Sub-headline */}
          <p className="mt-7 max-w-[620px] text-[17px] leading-relaxed text-landing-text-secondary sm:text-[19px]">
            Gere imagens, vídeos ultra-realistas e movimentos com poucos
            cliques. Sem estúdio, sem modelos, sem aparecer. Tudo que você
            precisa para criar conteúdo profissional está aqui.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            <a
              href="https://app.geraew.com"
              className="landing-glow-pulse group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-8 py-4 text-[15px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.03] hover:brightness-110"
            >
              Começar Grátis
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>

          {/* Microcopy */}
          <p className="mt-5 text-[13px] tracking-wide text-landing-text-muted">
            Sem cartão de crédito · Pronto em menos de 2 minutos
          </p>
        </div>

        {/* Visual — floating AI influencer cards */}
        <div className="relative mt-20 flex items-center justify-center gap-3 sm:gap-4 lg:mt-24 lg:gap-5">
          {[
            { h: 280, delay: "0s", float: "landing-float", rotate: -3 },
            { h: 320, delay: "0.6s", float: "landing-float-alt", rotate: 2 },
            { h: 350, delay: "0.2s", float: "landing-float", rotate: -1 },
            { h: 350, delay: "0.8s", float: "landing-float-alt", rotate: 1 },
            { h: 320, delay: "0.4s", float: "landing-float", rotate: -2 },
            { h: 280, delay: "1s", float: "landing-float-alt", rotate: 3 },
          ].map((card, i) => (
            <div
              key={i}
              className={`${card.float} relative overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.06] bg-gradient-to-b from-landing-card to-landing-bg shadow-2xl ${
                i === 0 || i === 5 ? "hidden lg:block" : ""
              } ${i === 1 || i === 4 ? "hidden sm:block" : ""}`}
              style={{
                width: "clamp(100px, 14vw, 170px)",
                height: card.h,
                transform: `rotate(${card.rotate}deg)`,
                animationDelay: card.delay,
              }}
            >
              {/* TODO: SUBSTITUIR POR IMAGENS REAIS */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141a1c] via-transparent to-transparent" />
              <div className="flex h-full flex-col items-center justify-end p-4 pb-5">
                <div className="mb-3 h-14 w-14 rounded-full bg-landing-accent/10 ring-1 ring-landing-accent/20" />
                <div className="h-2 w-16 rounded-full bg-[#f3f0ed]/[0.06]" />
                <div className="mt-1.5 h-2 w-10 rounded-full bg-[#f3f0ed]/[0.04]" />
              </div>
            </div>
          ))}

          {/* Glow behind cards */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[100px]"
            style={{ background: "rgba(162,221,0,0.08)" }}
          />
        </div>
      </div>
    </section>
  );
}
