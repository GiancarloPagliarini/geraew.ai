import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, LOCALE_HEADER, URL_LOCALES, type UrlLocale } from '@/i18n/config';

const PT_COUNTRIES = new Set(['BR', 'PT']);
const ES_COUNTRIES = new Set([
  'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO',
  'CR', 'CU', 'DO', 'GT', 'HN', 'NI', 'PA', 'SV', 'PR',
]);

const URL_TO_INTERNAL: Record<UrlLocale, string> = {
  'pt-br': 'pt-BR',
  en: 'en',
  es: 'es',
};

const INTERNAL_TO_URL: Record<string, UrlLocale> = {
  'pt-BR': 'pt-br',
  en: 'en',
  es: 'es',
};

function detectFromCountry(country: string | null): UrlLocale | null {
  if (!country) return null;
  const c = country.toUpperCase();
  if (PT_COUNTRIES.has(c)) return 'pt-br';
  if (ES_COUNTRIES.has(c)) return 'es';
  return 'en';
}

function detectFromAcceptLanguage(header: string | null): UrlLocale | null {
  if (!header) return null;
  const tags = header.split(',').map((t) => t.split(';')[0]?.trim().toLowerCase()).filter(Boolean);
  for (const tag of tags) {
    if (!tag) continue;
    if (tag.startsWith('pt')) return 'pt-br';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segments = pathname.split('/');
  const first = segments[1]?.toLowerCase();

  if (first && (URL_LOCALES as readonly string[]).includes(first)) {
    const urlLocale = first as UrlLocale;
    const internalLocale = URL_TO_INTERNAL[urlLocale];
    const rest = '/' + segments.slice(2).join('/');
    const target = request.nextUrl.clone();
    target.pathname = rest === '/' ? '/' : rest;

    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, internalLocale);

    const res = NextResponse.rewrite(target, { request: { headers } });
    res.cookies.set(LOCALE_COOKIE, internalLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return res;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  let urlLocale: UrlLocale;
  if (cookieLocale && INTERNAL_TO_URL[cookieLocale]) {
    urlLocale = INTERNAL_TO_URL[cookieLocale];
  } else {
    const country =
      request.headers.get('x-vercel-ip-country') ??
      request.headers.get('cf-ipcountry') ??
      request.headers.get('x-country-code');
    urlLocale =
      detectFromCountry(country) ??
      detectFromAcceptLanguage(request.headers.get('accept-language')) ??
      'pt-br';
  }

  const target = request.nextUrl.clone();
  target.pathname = `/${urlLocale}${pathname === '/' ? '' : pathname}`;
  target.search = search;
  const res = NextResponse.redirect(target);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
