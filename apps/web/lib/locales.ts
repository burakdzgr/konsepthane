/**
 * Locale constants and pure path helpers. This module has no server-only imports so client
 * components (header menus, session islands) can share the exact same rules as the server.
 */
export const locales = ['tr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'tr';

/** Locales whose pages may be indexed. English stays noindex until translated content exists. */
export const indexableLocales: readonly Locale[] = ['tr'];

export const localeNames: Record<Locale, string> = { tr: 'Türkçe', en: 'English' };
export const htmlLang: Record<Locale, string> = { tr: 'tr', en: 'en' };
export const ogLocale: Record<Locale, string> = { tr: 'tr_TR', en: 'en_US' };

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale);
}

/** Narrows a route param to a supported locale, falling back to the default. */
export function asLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** `/konsept/x` → `/tr/konsept/x`; keeps query strings and hashes intact. */
export function localePath(locale: Locale, path: string) {
  if (path === '/' || path === '') return `/${locale}`;
  if (/^\/(tr|en)(\/|\?|#|$)/.test(path)) return path;
  return `/${locale}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Reads the locale from a path such as `/en/konsept/x`; falls back to the default locale. */
export function localeFromPath(path: string | null | undefined): Locale {
  const segment = path?.split('/')[1]?.split(/[?#]/)[0];
  return isLocale(segment) ? segment : defaultLocale;
}

/** Strips the locale prefix so a path can be re-prefixed with another locale. */
export function stripLocale(path: string) {
  return path.replace(/^\/(tr|en)(?=\/|\?|#|$)/, '') || '/';
}
