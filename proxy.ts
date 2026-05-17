import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, LOCALE_HEADER, URL_LOCALES, type UrlLocale } from '@/i18n/config';

const URL_TO_INTERNAL: Record<UrlLocale, string> = {
  'pt-br': 'pt-BR',
  en: 'en',
  es: 'es',
};

function detectFromCountry(country: string | null): UrlLocale {
  if (country && country.toUpperCase() === 'BR') return 'pt-br';
  return 'en';
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

  const country =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-country-code');
  const urlLocale = detectFromCountry(country);

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
