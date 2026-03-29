"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";

const FAQS = [
  {
    q: "Como funciona o teste grátis?",
    a: "Você cria sua conta em menos de 2 minutos e recebe créditos gratuitos para testar a plataforma. Sem cartão de crédito, sem compromisso. Se gostar, é só escolher um plano.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. A GeraEW funciona 100% online, direto pelo navegador. Funciona no computador e no celular.",
  },
  {
    q: "Posso usar o conteúdo para vender no TikTok Shop?",
    a: "Sim. Muitos criadores usam a GeraEW para gerar vídeos de review e demonstração para o TikTok Shop. Use em qualquer plataforma para qualquer finalidade comercial.",
  },
  {
    q: "Os vídeos ficam com marca d'água?",
    a: "Nos planos pagos, não. Todo conteúdo gerado é seu, sem marca d'água e pronto para publicar.",
  },
  {
    q: "Posso usar para anúncios pagos?",
    a: "Sim. Imagens e vídeos gerados podem ser usados em Meta Ads, TikTok Ads, Google Ads e qualquer outra plataforma.",
  },
  {
    q: "O conteúdo gerado é exclusivo meu?",
    a: "Sim. Cada geração é única. Mesmo usando o mesmo prompt, os resultados são diferentes. Seu conteúdo é exclusivamente seu.",
  },
  {
    q: "O que acontece se meus créditos acabarem?",
    a: "Você pode aguardar a renovação mensal ou adquirir créditos extras a qualquer momento, sem precisar trocar de plano.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem multa, sem taxa, sem burocracia. Cancele direto pelo painel e continue usando até o fim do período pago.",
  },
];

function Item({
  faq,
  open,
  onToggle,
}: {
  faq: (typeof FAQS)[number];
  open: boolean;
  onToggle: () => void;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    if (body.current) setH(open ? body.current.scrollHeight : 0);
  }, [open]);

  return (
    <div className="border-b border-[#f3f0ed]/[0.05]">
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between py-6 text-left"
      >
        <span className="pr-6 text-[15px] font-medium text-landing-text transition-colors group-hover:text-landing-accent">
          {faq.q}
        </span>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-400",
            open
              ? "border-landing-accent/30 bg-landing-accent/10"
              : "border-[#f3f0ed]/[0.08] bg-transparent",
          )}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-all duration-400",
              open ? "rotate-180 text-landing-accent" : "text-landing-text-muted",
            )}
          />
        </div>
      </button>
      <div
        className="overflow-hidden transition-all duration-400 ease-out"
        style={{ maxHeight: h }}
      >
        <div ref={body} className="pb-6">
          <p className="text-[14px] leading-relaxed text-landing-text-secondary">
            {faq.a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="faq" className="bg-landing-bg-secondary py-28 lg:py-36">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        {/* Header */}
        <div
          ref={ref}
          className="text-center transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-landing-accent">
            Dúvidas
          </span>
          <h2 className="mt-5 font-sora text-3xl font-bold tracking-tight text-landing-text sm:text-4xl lg:text-[44px]">
            Perguntas Frequentes
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-landing-text-secondary">
            Tudo que você precisa saber antes de começar.
          </p>
        </div>

        {/* Accordion */}
        <div className="mt-14">
          {FAQS.map((faq, i) => (
            <Item
              key={i}
              faq={faq}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
