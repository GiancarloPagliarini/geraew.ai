'use client';

import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// TODO(reestruturação): trocar pela listagem de avisos do admin (announcements)
// quando a integração de Novidades for priorizada.
const NEWS_IDS = [
  'geraew2',
  'gptImage2',
  'veo31Fast',
  'avatares',
  'elevenlabsV3',
  'tiktokShop',
  'bibliotecaPrompts',
  'musicaIA',
] as const;

/** Gradientes levemente variados para os thumbs, mantendo o tom teal+lime. */
const THUMB_TINTS = [
  'radial-gradient(circle at 80% 20%, rgba(162,221,0,0.14), transparent 60%)',
  'radial-gradient(circle at 20% 80%, rgba(162,221,0,0.10), transparent 55%)',
  'radial-gradient(circle at 75% 75%, rgba(162,221,0,0.12), transparent 60%)',
  'radial-gradient(circle at 25% 25%, rgba(162,221,0,0.09), transparent 55%)',
];

export function NewsSection() {
  const t = useTranslations('home');

  return (
    <section>
      <span className="inline-block rounded-full border border-app-hairline-2 bg-app-surface px-4 py-1.5 text-[13.5px] font-semibold text-app-text">
        {t('news.title')}
      </span>

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
        {NEWS_IDS.map((id, i) => (
          <article key={id} className="group cursor-default">
            <div
              className="relative h-[152px] overflow-hidden rounded-[14px] border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] p-4 transition-all duration-200 ease-app group-hover:-translate-y-0.5 group-hover:border-app-hairline-2"
            >
              <div
                className="absolute inset-0"
                style={{ background: THUMB_TINTS[i % THUMB_TINTS.length] }}
              />
              <div className="relative">
                <h3 className="text-[19px] font-extrabold leading-tight text-app-text">
                  {t(`news.items.${id}.title`)}
                </h3>
                <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.8px] text-app-text-2">
                  {t(`news.items.${id}.tag`)}
                </p>
              </div>
            </div>
            <p className="mt-2.5 text-[13.5px] text-app-text-2">{t(`news.items.${id}.caption`)}</p>
          </article>
        ))}
      </div>

      <div className="mt-7 flex justify-center">
        <button
          type="button"
          onClick={() => toast.info(t('soon'))}
          className="rounded-full border border-app-hairline-2 bg-app-surface px-5 py-2 text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-card"
        >
          {t('news.more')}
        </button>
      </div>
    </section>
  );
}
