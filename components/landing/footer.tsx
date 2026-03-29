import { Sparkles, Instagram, Music2, MessageCircle } from "lucide-react";

const PRODUCT = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Preços", href: "#precos" },
  { label: "Galeria", href: "#resultados" },
  { label: "FAQ", href: "#faq" },
];

const COMPANY = [
  { label: "Sobre", href: "#" },
  { label: "Contato", href: "#" },
];

const LEGAL = [
  { label: "Termos de Uso", href: "/legal/termos-de-uso" },
  { label: "Política de Privacidade", href: "/legal/politica-de-privacidade" },
];

const SOCIAL = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Music2, href: "#", label: "TikTok" },
  { icon: MessageCircle, href: "#", label: "Discord" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#f3f0ed]/[0.04] bg-landing-bg py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand — wider column */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-landing-accent/15">
                <Sparkles className="h-4 w-4 text-landing-accent" />
              </div>
              <span className="font-sora text-[17px] font-bold tracking-tight text-landing-text">
                Geraew
              </span>
            </div>
            <p className="mt-5 max-w-[260px] text-[14px] leading-relaxed text-landing-text-muted">
              Crie influencers, vídeos e imagens profissionais com inteligência
              artificial.
            </p>

            {/* Social */}
            <div className="mt-6 flex gap-2.5">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.06] text-landing-text-muted transition-all duration-300 hover:border-landing-accent/20 hover:text-landing-accent"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Produto */}
          <div className="md:col-span-2 md:col-start-6">
            <h4 className="text-[13px] font-semibold text-landing-text">
              Produto
            </h4>
            <ul className="mt-4 space-y-3">
              {PRODUCT.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13px] text-landing-text-muted transition-colors duration-300 hover:text-landing-text"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div className="md:col-span-2">
            <h4 className="text-[13px] font-semibold text-landing-text">
              Empresa
            </h4>
            <ul className="mt-4 space-y-3">
              {COMPANY.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13px] text-landing-text-muted transition-colors duration-300 hover:text-landing-text"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-2">
            <h4 className="text-[13px] font-semibold text-landing-text">
              Legal
            </h4>
            <ul className="mt-4 space-y-3">
              {LEGAL.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-[13px] text-landing-text-muted transition-colors duration-300 hover:text-landing-text"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-[#f3f0ed]/[0.04] pt-6 sm:mt-14 sm:pt-8 text-center text-[13px] text-landing-text-muted">
          &copy; 2026 Geraew. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
