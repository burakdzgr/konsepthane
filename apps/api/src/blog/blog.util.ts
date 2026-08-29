/** Pure helpers for the blog service; unit-tested without a database. */

export function blogSlugify(value: string) {
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
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

export const MAX_TAGS = 12;
export const MAX_TAG_LENGTH = 40;

/** Trims, de-duplicates (case-insensitively) and caps the tag list; empty entries are dropped. */
export function normaliseTags(tags: readonly string[] | undefined) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags ?? []) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
    const key = tag.toLocaleLowerCase('tr-TR');
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= MAX_TAGS) break;
  }
  return result;
}

/** ~200 words per minute, never below one minute; Markdown syntax is counted as words (close enough). */
export function readingMinutesFor(...texts: Array<string | null | undefined>) {
  const words = texts
    .filter((text): text is string => Boolean(text))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Publication timestamp rule:
 * - an explicit `requested` date always wins (scheduling: a future date keeps the post hidden
 *   until then even though its status is PUBLISHED);
 * - publishing without a date stamps "now" on the first publish and keeps the original date on
 *   later edits (so re-saving a published post does not bump it to the top of the list);
 * - a draft keeps whatever date it had (the date can be prepared before publishing).
 */
export function resolvePublishedAt(input: {
  status: string;
  requested: Date | null | undefined;
  current: Date | null | undefined;
  now?: Date;
}): Date | null {
  if (input.requested !== undefined) return input.requested;
  if (input.status === 'PUBLISHED') return input.current ?? input.now ?? new Date();
  return input.current ?? null;
}

/** Tag slug used in URLs (`/blog/etiket/<slug>`); matching is done on the stored tag text. */
export function tagSlug(tag: string) {
  return blogSlugify(tag);
}
