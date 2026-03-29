"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "./use-scroll-reveal";
import { useAuth } from "@/lib/auth-context";

const ITEMS: { src: string; type: "image" | "video" }[] = [
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmnb5y9jy002ili0166936754/155ad5c2-f554-475b-b8b8-c5c64a639a6b/output_3.mp4", type: "video" },
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmn5h10lz002os7015ezt1rk8/0a0ec4b5-b6e5-481a-89c7-1f36d529febd/output_0.mp4", type: "video" },
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmmygp8wl000sml01l4h6vteq/162b05b9-0e95-4799-ba90-6544efa9acd1/output_0.png", type: "image" },
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmn75brpl0092s101g088osyw/abbc63ee-8331-4bdf-b416-73e5393c7de3/output_0.png", type: "image" },
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmmv24p4y00wdq201jad39azh/ed291ab0-d3ef-45d6-9ed8-cf1887a54a76/output_0.mp4", type: "video" },
  { src: "https://qwmnnkgejgjlpzofrxrl.supabase.co/storage/v1/object/public/ai-generations/generations/cmmptwwks00j6qu018a0f0gg7/cf0f42c0-d71d-4df6-b6ec-0dd41b727c05/output_0.mp4", type: "video" },
];

function LazyVideo({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full">
      {visible ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-[#f3f0ed]/[0.03]" />
      )}
    </div>
  );
}

export function Gallery() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="resultados" className="bg-landing-bg-secondary py-16 sm:py-28 lg:py-36">
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
          <h2 className="mt-4 font-sora text-[26px] font-bold tracking-tight text-landing-text sm:mt-5 sm:text-3xl lg:text-[44px]">
            Veja o que já está sendo criado com a Geraew.
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-landing-text-secondary sm:mt-5 sm:text-[17px]">
            Cada imagem e vídeo abaixo foi gerado 100% por inteligência
            artificial dentro da nossa plataforma.
          </p>
        </div>

        {/* Masonry grid */}
        <div className="mt-8 columns-2 gap-3 sm:mt-12 sm:columns-3 sm:gap-4 lg:gap-5">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="group mb-3 overflow-hidden rounded-xl sm:mb-4 border border-[#f3f0ed]/[0.04] bg-landing-card break-inside-avoid transition-all duration-400 hover:border-landing-accent/15 lg:mb-5"
            >
              {item.type === "video" ? (
                <LazyVideo src={item.src} />
              ) : (
                <Image
                  src={item.src}
                  alt={`Resultado ${i + 1}`}
                  width={400}
                  height={500}
                  loading="lazy"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center sm:mt-14">
          <a
            href="/workspace"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-landing-accent px-6 py-3 text-[13px] font-bold text-[#1a2123] sm:px-7 sm:py-3.5 sm:text-[14px] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            {isLoggedIn ? "Acessar Workspace" : "Crie o seu agora"}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
