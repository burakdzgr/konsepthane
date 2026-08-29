import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { absoluteUrl, siteName } from '@ilham/seo';
import { en } from '@/messages/en';
import { tr } from '@/messages/tr';

export {
  asLocale,
  defaultLocale,
  htmlLang,
  indexableLocales,
  isLocale,
  localeFromPath,
  localeNames,
  localePath,
  locales,
  ogLocale,
  stripLocale,
} from './locales';
export type { Locale } from './locales';
import {
  defaultLocale,
  indexableLocales,
  isLocale,
  localePath,
  ogLocale,
  stripLocale,
  type Locale,
} from './locales';

export type Dictionary = typeof tr;
const dictionaries: Record<Locale, Dictionary> = { tr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Current request locale, set by `proxy.ts`. Usable in Server Components and server actions. */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get('x-locale');
  return isLocale(value) ? value : defaultLocale;
}

/** Current request path (without the locale prefix), set by `proxy.ts`. */
export async function getPathname(): Promise<string> {
  const value = (await headers()).get('x-pathname');
  return value ? stripLocale(value) : '/';
}

/**
 * Locale-aware metadata: an absolute self-canonical, hreflang only for indexable translations
 * (+ x-default), and noindex for locales that do not have complete translated content yet.
 */
export function localeMetadata(
  locale: Locale,
  path: string,
  input: Metadata & {
    indexable?: boolean;
    /**
     * Locales in which an equivalent, translated page exists at the same path. Defaults to the
     * indexable locales (today only `tr`). When English content arrives, pass the locales the
     * record is actually translated into — hreflang must never reference a page that does not
     * exist, and each locale stays self-canonical.
     */
    translations?: readonly Locale[];
  },
): Metadata {
  const { indexable = true, translations, ...rest } = input;
  const canonical = absoluteUrl(localePath(locale, path));
  const explicitNoindex =
    typeof rest.robots === 'object' && rest.robots !== null && rest.robots.index === false;
  const mayIndex = indexable && !explicitNoindex && indexableLocales.includes(locale);
  const available = (translations ?? indexableLocales).filter((code) =>
    indexableLocales.includes(code),
  );
  const languages =
    mayIndex && available.length > 0
      ? {
          ...Object.fromEntries(
            available.map((code) => [code, absoluteUrl(localePath(code, path))]),
          ),
          'x-default': absoluteUrl(
            localePath(available.includes(defaultLocale) ? defaultLocale : available[0]!, path),
          ),
        }
      : undefined;
  return {
    ...rest,
    alternates: {
      ...rest.alternates,
      canonical,
      ...(languages ? { languages } : {}),
    },
    robots:
      rest.robots ??
      (mayIndex
        ? {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              'max-image-preview': 'large',
              'max-snippet': -1,
              'max-video-preview': -1,
            },
          }
        : { index: false, follow: true }),
    openGraph: {
      siteName,
      locale: ogLocale[locale],
      url: canonical,
      // A page-level `openGraph` object replaces the root segment's file-based image entirely
      // (nested metadata fields are not merged), so the default card is always set explicitly.
      images: [defaultSocialImage],
      ...rest.openGraph,
    },
    twitter: { card: 'summary_large_image', ...rest.twitter },
  };
}

/** Rasterised brand card from `app/opengraph-image.tsx`; pages with a hero image override it. */
export const defaultSocialImage = {
  url: absoluteUrl('/opengraph-image'),
  width: 1200,
  height: 630,
  alt: `${siteName} — kutlama fikirleri ve gerçek deneyimler`,
};
