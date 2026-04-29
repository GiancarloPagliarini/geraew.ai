import type { Metadata } from 'next';
import type { ApiPromptSection } from '@/lib/api';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Sora, DM_Sans } from 'next/font/google';
import { PromptsClient } from './PromptsClient';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Biblioteca de Prompts · GeraEW',
  description:
    'Explore a biblioteca completa de prompts da GeraEW. Centenas de prompts prontos para gerar imagens e vídeos com IA, organizados por nicho.',
  openGraph: {
    title: 'Biblioteca de Prompts · GeraEW',
    description:
      'Centenas de prompts prontos para gerar imagens e vídeos com IA. Copie, use e crie conteúdo profissional em segundos.',
    type: 'website',
    url: 'https://geraew.com/prompts',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Biblioteca de Prompts · GeraEW',
    description:
      'Centenas de prompts prontos para gerar imagens e vídeos com IA.',
  },
};

export const revalidate = 300;

async function getSections(): Promise<ApiPromptSection[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/prompts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { sections: ApiPromptSection[] } = await res.json();
    return data.sections ?? [];
  } catch {
    return [];
  }
}

export default async function PromptsPage() {
  const sections = await getSections();
  const total = sections.reduce(
    (sum, s) =>
      sum + s.categories.reduce((cs, c) => cs + c.prompts.length, 0),
    0,
  );

  return (
    <div
      className={`${sora.variable} ${dmSans.variable} min-h-screen bg-[#111618] font-dm text-[#f3f0ed]`}
    >
      <Navbar />

      <main className="pt-[88px] sm:pt-[96px]">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <header className="mb-8 flex flex-col gap-3">
            <span className="w-fit rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#a2dd00]">
              Fábrica de Prompts
            </span>
            <h1 className="text-3xl font-bold md:text-5xl">
              Biblioteca de Prompts
            </h1>
            <p className="max-w-2xl text-sm text-[#f3f0ed]/50 md:text-base">
              {total > 0
                ? `Explore ${total} prompts prontos para gerar imagens e vídeos com IA. Clique no ícone de copiar e use direto na sua plataforma favorita.`
                : 'Explore os prompts disponíveis na plataforma. Clique no ícone de copiar para usar.'}
            </p>
          </header>

          {sections.length === 0 ? (
            <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2 p-10 text-center text-sm text-[#f3f0ed]/40">
              Não foi possível carregar os prompts no momento. Tente novamente em instantes.
            </div>
          ) : (
            <PromptsClient sections={sections} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
