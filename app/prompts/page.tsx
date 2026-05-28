import type { Metadata } from 'next';
import type { ApiPromptSection } from '@/lib/api';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Sora, DM_Sans } from 'next/font/google';
import { getTranslations } from 'next-intl/server';
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('promptsLibrary');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: {
      title: t('metaTitle'),
      description: t('ogDescription'),
      type: 'website',
      url: 'https://geraew.com/prompts',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('metaTitle'),
      description: t('twitterDescription'),
    },
  };
}

export const revalidate = 300;

const SECTION_ORDER = ['nicho hot', 'influencer de ia', 'role noite'];

function normalizeForOrder(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function orderRank(title: string): number {
  const normalized = normalizeForOrder(title).replace(/\bi\s+a\b/g, 'ia');
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    if (normalized.includes(SECTION_ORDER[i])) return i;
  }
  return SECTION_ORDER.length;
}

async function getSections(): Promise<ApiPromptSection[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/prompts`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: { sections: ApiPromptSection[] } = await res.json();
    const sections = data.sections ?? [];
    return [...sections].sort((a, b) => orderRank(a.title) - orderRank(b.title));
  } catch {
    return [];
  }
}

export default async function PromptsPage() {
  const t = await getTranslations('promptsLibrary');
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
              {t('badge')}
            </span>
            <h1 className="text-3xl font-bold md:text-5xl">
              {t('title')}
            </h1>
            <p className="max-w-2xl text-sm text-[#f3f0ed]/50 md:text-base">
              {total > 0
                ? t('descriptionWithTotal', { total })
                : t('descriptionEmpty')}
            </p>
          </header>

          {sections.length === 0 ? (
            <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2 p-10 text-center text-sm text-[#f3f0ed]/40">
              {t('loadError')}
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
