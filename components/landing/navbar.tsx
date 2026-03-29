"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

const LINKS = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Resultados", href: "#resultados" },
  { label: "Preços", href: "#precos" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
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
      <nav className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5 sm:h-[72px] sm:px-8">
        {/* logo */}
        <a href="/" className="group flex items-center gap-2">
          <Image
            src="/logo_2.svg"
            alt="Geraew"
            width={130}
            height={32}
            className="h-8 w-auto"
            priority
          />
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
          {isLoggedIn ? (
            <a
              href="/workspace"
              className="rounded-xl bg-landing-accent px-5 py-2.5 text-[13px] font-semibold text-[#1a2123] transition-all duration-300 hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
            >
              Acessar Workspace
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="rounded-xl border border-[#f3f0ed]/[0.08] px-5 py-2.5 text-[13px] font-medium text-[#f3f0ed]/60 transition-all duration-300 hover:border-[#f3f0ed]/[0.15] hover:text-[#f3f0ed]"
              >
                Entrar
              </a>
              <a
                href="/workspace"
                className="rounded-xl bg-landing-accent px-5 py-2.5 text-[13px] font-semibold text-[#1a2123] transition-all duration-300 hover:shadow-[0_0_24px_rgba(162,221,0,0.3)] hover:brightness-110"
              >
                Testar Grátis
              </a>
            </>
          )}
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
          "fixed inset-0 top-[64px] z-40 bg-[#141a1c]/[0.98] backdrop-blur-2xl transition-all duration-400 sm:top-[72px] md:hidden",
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
            {isLoggedIn ? (
              <a
                href="/workspace"
                className="rounded-xl bg-landing-accent py-3.5 text-center text-[14px] font-semibold text-[#1a2123] transition-all hover:brightness-110"
              >
                Acessar Workspace
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="rounded-xl border border-[#f3f0ed]/[0.08] py-3.5 text-center text-[14px] font-medium text-[#f3f0ed]/60 transition-all hover:border-[#f3f0ed]/[0.15] hover:text-[#f3f0ed]"
                >
                  Entrar
                </a>
                <a
                  href="/workspace"
                  className="rounded-xl bg-landing-accent py-3.5 text-center text-[14px] font-semibold text-[#1a2123] transition-all hover:brightness-110"
                >
                  Testar Grátis
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
