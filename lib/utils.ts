import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Minúsculas e sem acentos — para comparações de busca. */
export function normalizeSearch(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** "há 2 minutos" / "ontem" — tempo relativo localizado. */
export function formatRelativeTime(date: string | Date, locale: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffSeconds = (d.getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSeconds) >= secs) return rtf.format(Math.round(diffSeconds / secs), unit);
  }
  return rtf.format(Math.round(diffSeconds), 'second');
}
