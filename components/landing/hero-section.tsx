"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

const HERO_CARDS: { h: number; delay: string; float: string; rotate: number; src: string | null; video?: string | null }[] = [
  { h: 280, delay: "0s", float: "landing-float", rotate: -3, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmmo0y3ig001pmj012ef18i2x/f8b501b1-404e-4f90-80e5-6369dd0a1c85/output_1.mp4" },
  { h: 320, delay: "0.6s", float: "landing-float-alt", rotate: 2, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/utils/hf_20260215_062116_c9ddf0ba-3933-4775-a153-416f3a4ceba2.mp4" },
  { h: 350, delay: "0.2s", float: "landing-float", rotate: -1, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/utils/hf_20260201_001035_5d855ac6-5faf-4ec9-ad55-5b8b3c6c8b27.mp4" },
  { h: 350, delay: "0.8s", float: "landing-float-alt", rotate: 1, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmnb7rni6004qli01djg36ikq/79f3dded-b759-487e-90d3-3ba02d3decda/output_0.mp4" },
  { h: 320, delay: "0.4s", float: "landing-float", rotate: -2, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/utils/output_0%20(1).mp4" },
  { h: 280, delay: "1s", float: "landing-float-alt", rotate: 3, src: null, video: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/utils/hf_20260304_053449_2ac62494-bf74-454e-8c64-9b04f658037a.mp4" },
];

function CardContent({ card }: { card: typeof HERO_CARDS[number] }) {
  if (card.video) {
    return (
      <>
        <video
          src={card.video}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141a1c]/60 via-transparent to-transparent" />
      </>
    );
  }
  if (card.src) {
    return (
      <>
        <Image
          src={card.src}
          alt="Influencer digital gerada com IA"
          fill
          className="object-cover"
          sizes="170px"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141a1c]/60 via-transparent to-transparent" />
      </>
    );
  }
  return null;
}

function HeroCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const updateScales = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    const cards = Array.from(container.children) as HTMLElement[];

    cards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      const maxDistance = container.clientWidth * 0.45;
      const t = Math.min(distance / maxDistance, 1);
      const scale = 1 - t * 0.22;
      const opacity = 1 - t * 0.4;
      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    // Scroll to center on the 3rd card (index 2)
    requestAnimationFrame(() => {
      const middleCard = container.children[2] as HTMLElement;
      if (middleCard) {
        container.scrollLeft =
          middleCard.offsetLeft -
          (container.clientWidth - middleCard.clientWidth) / 2;
      }
      updateScales();
    });

    container.addEventListener("scroll", updateScales, { passive: true });
    return () => container.removeEventListener("scroll", updateScales);
  }, [updateScales]);

  return (
    <div className="relative mt-14 lg:hidden">
      <div
        ref={scrollRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto"
        style={{
          paddingLeft: "calc(50% - 75px)",
          paddingRight: "calc(50% - 75px)",
        }}
      >
        {HERO_CARDS.map((card, i) => (
          <div
            key={i}
            className="relative shrink-0 snap-center overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.06] bg-gradient-to-b from-landing-card to-landing-bg shadow-2xl will-change-transform"
            style={{ width: 150, height: 240 }}
          >
            <CardContent card={card} />
          </div>
        ))}
      </div>

      {/* Glow behind carousel */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[200px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[80px]"
        style={{ background: "rgba(162,221,0,0.08)" }}
      />
    </div>
  );
}

export function HeroSection() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  return (
    <section className="landing-noise relative overflow-hidden pt-24 pb-16 sm:pt-40 sm:pb-32 lg:pt-48 lg:pb-40">
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
          <div className="landing-shimmer mb-6 inline-flex items-center gap-2 rounded-full border border-landing-accent/20 bg-landing-accent/[0.07] px-4 py-1.5 sm:mb-8">
            <span className="text-[13px] font-medium text-landing-accent">
              Quem dominar IA agora, vai dominar o mercado amanhã.
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-sora text-[32px] leading-[1.1] font-extrabold tracking-tight text-landing-text sm:text-[56px] lg:text-[68px]">
            Crie influencers digitais com IA e domine qualquer plataforma.
          </h1>

          {/* Sub-headline */}
          <p className="mt-5 max-w-[620px] text-[15px] leading-relaxed text-landing-text-secondary sm:mt-7 sm:text-[17px] lg:text-[19px]">
            Gere imagens, vídeos ultra-realistas e movimentos com poucos
            cliques. Sem estúdio, sem modelos, sem aparecer. Tudo que você
            precisa para criar conteúdo profissional está aqui.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10 sm:flex-row sm:gap-5">
            <a
              href="/workspace"
              className="landing-glow-pulse group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.03] hover:brightness-110 sm:px-8 sm:py-4 sm:text-[15px]"
            >
              {isLoggedIn ? "Acessar Workspace" : "Começar Grátis"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>

          {/* Microcopy */}
          <p className="mt-5 text-[13px] tracking-wide text-landing-text-muted">
            Pronto em menos de 2 minutos
          </p>
        </div>

        {/* Mobile: swipeable carousel */}
        <HeroCarousel />

        {/* Desktop: floating AI influencer cards */}
        <div className="relative mt-24 hidden items-center justify-center gap-5 lg:flex">
          {HERO_CARDS.map((card, i) => (
            <div
              key={i}
              className={`${card.float} relative overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.06] bg-gradient-to-b from-landing-card to-landing-bg shadow-2xl`}
              style={{
                width: 170,
                height: card.h,
                transform: `rotate(${card.rotate}deg)`,
                animationDelay: card.delay,
              }}
            >
              <CardContent card={card} />
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
