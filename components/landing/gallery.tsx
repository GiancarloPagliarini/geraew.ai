"use client";

import { useState } from "react";
import { Eye, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";

type Category = "all" | "images" | "videos" | "faceswap";

const TABS: { label: string; value: Category }[] = [
  { label: "Todos", value: "all" },
  { label: "Imagens", value: "images" },
  { label: "Vídeos", value: "videos" },
  { label: "Face Swap", value: "faceswap" },
];

/* TODO: SUBSTITUIR POR IMAGENS REAIS */
const ITEMS: { id: number; cat: Category; ratio: string }[] = [
  { id: 1, cat: "images", ratio: "3/4" },
  { id: 2, cat: "videos", ratio: "1/1" },
  { id: 3, cat: "faceswap", ratio: "3/4" },
  { id: 4, cat: "images", ratio: "4/3" },
  { id: 5, cat: "videos", ratio: "3/4" },
  { id: 6, cat: "images", ratio: "1/1" },
  { id: 7, cat: "faceswap", ratio: "3/4" },
  { id: 8, cat: "videos", ratio: "4/3" },
  { id: 9, cat: "images", ratio: "3/4" },
];

export function Gallery() {
  const [active, setActive] = useState<Category>("all");
  const { ref, isVisible } = useScrollReveal();

  const filtered = active === "all" ? ITEMS : ITEMS.filter((i) => i.cat === active);

  return (
    <section id="resultados" className="bg-landing-bg-secondary py-28 lg:py-36">
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
            Galeria
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Veja o que já está sendo criado com a GeraEW.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-landing-text-secondary">
            Cada imagem e vídeo abaixo foi gerado 100% por inteligência
            artificial dentro da nossa plataforma.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActive(tab.value)}
              className={cn(
                "rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-300",
                active === tab.value
                  ? "bg-landing-accent text-[#1a2123]"
                  : "text-landing-text-muted hover:bg-[#f3f0ed]/[0.04] hover:text-landing-text",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        <div className="mt-10 columns-2 gap-4 sm:columns-3 lg:gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group mb-4 overflow-hidden rounded-xl border border-[#f3f0ed]/[0.04] bg-landing-card break-inside-avoid transition-all duration-400 hover:border-landing-accent/15 lg:mb-5"
              style={{ aspectRatio: item.ratio }}
            >
              {/* TODO: SUBSTITUIR POR IMAGENS REAIS */}
              <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-landing-card to-landing-bg">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-landing-accent/[0.06]" />
                  <span className="text-[11px] text-landing-text-muted">
                    Resultado {item.id}
                  </span>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-[#141a1c]/60 opacity-0 backdrop-blur-sm transition-opacity duration-400 group-hover:opacity-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f3f0ed]/20 bg-[#f3f0ed]/10">
                    <Eye className="h-4 w-4 text-landing-text" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 flex justify-center">
          <a
            href="https://app.geraew.com"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-7 py-3.5 text-[14px] font-bold text-[#1a2123] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            Crie o seu agora — Testar Grátis
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
