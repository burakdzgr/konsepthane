import { NotFoundContent } from '@/components/not-found-content';
import { getDictionary, locales } from '@/lib/i18n';

/**
 * The not-found boundary is part of every route's tree, so it must not read request headers
 * (that would make all pages dynamic). Labels for every locale are passed down and the client
 * picks the right set from the current pathname.
 */
export default function LocaleNotFound() {
  const labels = Object.fromEntries(
    locales.map((locale) => [locale, getDictionary(locale).pages.notFound]),
  ) as Record<(typeof locales)[number], { title: string; text: string; home: string }>;
  return <NotFoundContent labels={labels} />;
}
