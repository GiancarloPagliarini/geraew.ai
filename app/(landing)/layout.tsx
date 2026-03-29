
import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Geraew — Crie Influencers Digitais com IA | Imagens e Vídeos Ultra-Realistas",
  description:
    "Plataforma de inteligência artificial para criar influencers digitais, imagens e vídeos ultra-realistas. Sem aparecer, sem estúdio, sem equipe. Comece grátis.",
  openGraph: {
    title: "Geraew — Crie Influencers Digitais com IA",
    description:
      "Gere imagens e vídeos ultra-realistas com IA. Sem aparecer, sem estúdio. Comece grátis.",
    type: "website",
    url: "https://geraew.com",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${sora.variable} ${dmSans.variable} font-dm bg-landing-bg text-landing-text min-h-screen overflow-x-hidden`}
    >
      {children}
    </div>
  );
}
