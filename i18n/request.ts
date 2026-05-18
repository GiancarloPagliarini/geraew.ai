import { headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, LOCALE_HEADER, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const hdrs = await headers();
  const fromHeader = hdrs.get(LOCALE_HEADER) as Locale | null;

  const locale: Locale =
    fromHeader && locales.includes(fromHeader) ? fromHeader : defaultLocale;

  const base = (await import(`../messages/${locale}.json`)).default;
  const partials = await loadPartials(locale);

  return {
    locale,
    messages: { ...base, ...partials },
  };
});

async function loadPartials(locale: Locale): Promise<Record<string, unknown>> {
  const names = [
    'workspace',
    'account',
    'affiliate',
    'editor',
    'editor-plans',
    'editor-panels',
    'editor-chrome',
    'editor-dialogs',
    'editor-misc',
    'editor-rewards',
    'feedback',
  ] as const;
  const partials: Record<string, unknown> = {};
  for (const name of names) {
    try {
      const mod = await import(`../messages/${locale}/${name}.json`);
      Object.assign(partials, mod.default);
    } catch {
      // partial doesn't exist yet
    }
  }
  return partials;
}
