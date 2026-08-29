import type { CommunityTopic } from '@ilham/shared-types';
import { localePath, type Locale } from './i18n';

/** Same Turkish-aware slug rules as the API (`community.service.ts#slugify`). */
export function slugify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Where a topic chip should point: the topic hub (`/konu/<slug>`) whenever a matching topic
 * exists (every header chip is seeded as a topic), so the site's most frequent internal links
 * use one stable URL scheme. Thin hubs are `noindex` on the page itself; the (noindex) search
 * results are only the fallback for queries without a topic.
 */
export function topicHref(locale: Locale, query: string, topics: CommunityTopic[]) {
  const wanted = slugify(query);
  const match =
    topics.find((topic) => topic.slug === wanted || slugify(topic.name) === wanted) ??
    topics.find((topic) => wanted.length >= 4 && topic.slug.startsWith(wanted));
  if (match) return localePath(locale, `/konu/${match.slug}`);
  return localePath(locale, `/kesfet?q=${encodeURIComponent(query)}`);
}
