export const locales = ['pt-BR', 'en', 'es'] as const;
export type Locale = (typeof locales)[number];

export const URL_LOCALES = ['pt-br', 'en', 'es'] as const;
export type UrlLocale = (typeof URL_LOCALES)[number];

export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'geraew-locale';
export const LOCALE_HEADER = 'x-geraew-locale';
