"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Menu, X } from "lucide-react";

const LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Resultados", href: "#resultados" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function scroll(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 80,
        behavior: "smooth",
      });
    }
    setOpen(false);
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 border-b transition-all duration-500",
        scrolled
          ? "border-[#f3f0ed]/[0.06] bg-[#141a1c]/90 shadow-[0_1px_40px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
          : "border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* logo */}
        <a href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-landing-accent/15 transition-colors group-hover:bg-landing-accent/25">
            <Sparkles className="h-4 w-4 text-landing-accent" />
          </div>
          <span className="font-sora text-[17px] font-bold tracking-tight text-landing-text">
            GeraEW
          </span>
        </a>

        {/* desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scroll(e, l.href)}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#f3f0ed]/50 transition-all duration-300 hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]/90"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <a
            href="https://app.geraew.com/login"
            className="rounded-xl border border-[#f3f0ed]/[0.08] px-5 py-2.5 text-[13px] font-medium text-[#f3f0ed]/60 transition-all duration-300 hover:border-[#f3f0ed]/[0.15] hover:text-[#f3f0ed]"
          >
            Entrar
          </a>
          <a
            href="https://app.geraew.com"
            className="rounded-xl bg-landing-accent px-5 py-2.5 text-[13px] font-semibold text-[#1a2123] transition-all duration-300 hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
          >
            Testar Grátis
          </a>
        </div>

        {/* mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed] md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 top-[72px] z-40 bg-[#141a1c]/[0.98] backdrop-blur-2xl transition-all duration-400 md:hidden",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex flex-col gap-1 px-5 pt-6">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scroll(e, l.href)}
              className="rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-8 flex flex-col gap-3 border-t border-[#f3f0ed]/[0.06] pt-8">
            <a
              href="https://app.geraew.com/login"
              className="rounded-xl border border-[#f3f0ed]/[0.08] py-3.5 text-center text-[14px] font-medium text-[#f3f0ed]/60 transition-all hover:border-[#f3f0ed]/[0.15] hover:text-[#f3f0ed]"
            >
              Entrar
            </a>
            <a
              href="https://app.geraew.com"
              className="rounded-xl bg-landing-accent py-3.5 text-center text-[14px] font-semibold text-[#1a2123] transition-all hover:brightness-110"
            >
              Testar Grátis
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
