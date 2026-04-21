import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from './config';

function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const preferred = header.split(',')[0]?.trim().toLowerCase();
  if (!preferred) return null;
  if (preferred.startsWith('pt')) return 'pt-BR';
  if (preferred.startsWith('en')) return 'en';
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value as Locale | undefined;

  let locale: Locale = defaultLocale;
  if (cookieLocale && locales.includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const hdrs = await headers();
    const detected = parseAcceptLanguage(hdrs.get('accept-language'));
    if (detected) locale = detected;
  }

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
