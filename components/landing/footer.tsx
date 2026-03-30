import { Instagram } from "lucide-react";
import Image from "next/image";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

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
  { label: "Termos de Uso", href: "/termos-de-uso" },
  { label: "Política de Privacidade", href: "/politica-de-privacidade" },
];

const SOCIAL = [
  { Icon: Instagram, href: "https://www.instagram.com/geraew.ai/", label: "Instagram" },
  { Icon: TikTokIcon, href: "https://www.tiktok.com/@geraew.ia", label: "TikTok" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#f3f0ed]/[0.04] bg-landing-bg py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand — wider column */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo_2.svg"
                alt="Geraew"
                width={130}
                height={32}
                className="h-8 w-auto"
                priority
              />
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
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.06] text-landing-text-muted transition-all duration-300 hover:border-landing-accent/20 hover:text-landing-accent"
                >
                  <s.Icon className="h-4 w-4" />
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
