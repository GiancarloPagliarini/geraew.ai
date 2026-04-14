import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Subsection = {
  title: string;
  content: string[];
};

type Section = {
  title: string;
  content?: string[];
  list?: string[];
  after?: string;
  subsections?: Subsection[];
};

export default function TermosDeUsoPage() {
  const t = useTranslations('legal');
  const sections = t.raw('terms.sections') as Section[];

  return (
    <div className="min-h-screen bg-[#111518] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#111518]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('common.back')}
          </Link>
          <Image src="/full_logo.svg" alt={t('common.logoAlt')} width={100} height={32} className="mix-blend-lighten" />
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase text-[#a2dd00]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
            {t('common.tag')}
          </div>
          <h1 className="text-3xl font-bold text-white">{t('terms.title')}</h1>
          <p className="mt-2 text-sm text-white/40">{t('common.lastUpdated')}</p>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
              <h2 className="mb-4 text-base font-semibold text-white">{section.title}</h2>

              {section.subsections ? (
                <div className="flex flex-col gap-5">
                  {section.subsections.map((sub) => (
                    <div key={sub.title}>
                      <h3 className="mb-2 text-sm font-medium text-[#a2dd00]/80">{sub.title}</h3>
                      {sub.content.map((p, i) => (
                        <p key={i} className="text-sm leading-relaxed text-white/60 mb-2 last:mb-0">{p}</p>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {section.content?.map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed text-white/60 mb-3">{p}</p>
                  ))}
                  {section.list && (
                    <ul className="mb-3 flex flex-col gap-2">
                      {section.list.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a2dd00]/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.after && (
                    <p className="text-sm leading-relaxed text-white/60">{section.after}</p>
                  )}
                </>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-8 text-center">
          <p className="text-xs text-white/25">{t('common.rights')}</p>
          <Link href="/politica-de-privacidade" className="text-xs text-[#a2dd00]/50 hover:text-[#a2dd00]/80 transition-colors">
            {t('common.seePrivacy')}
          </Link>
        </div>
      </main>
    </div>
  );
}
