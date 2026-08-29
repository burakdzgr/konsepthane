import { describe, expect, it } from 'vitest';
import {
  blogSlugify,
  normaliseTags,
  readingMinutesFor,
  resolvePublishedAt,
  tagSlug,
} from '../src/blog/blog.util';

describe('blogSlugify', () => {
  it('transliterates Turkish characters and collapses separators', () => {
    expect(blogSlugify('1 Yaş Doğum Günü: Şık & Kolay Fikirler')).toBe(
      '1-yas-dogum-gunu-sik-kolay-fikirler',
    );
    expect(blogSlugify('  İlkbahar   Trendleri ')).toBe('ilkbahar-trendleri');
  });
  it('returns an empty string when nothing usable remains', () => {
    expect(blogSlugify('***')).toBe('');
  });
});

describe('normaliseTags', () => {
  it('trims, de-duplicates case-insensitively and caps the list', () => {
    expect(normaliseTags([' Balon ', 'balon', 'BALON', '', 'Pasta'])).toEqual(['Balon', 'Pasta']);
    expect(normaliseTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(12);
  });
  it('accepts undefined', () => {
    expect(normaliseTags(undefined)).toEqual([]);
  });
});

describe('readingMinutesFor', () => {
  it('never reports less than a minute and rounds at ~200 wpm', () => {
    expect(readingMinutesFor('kısa')).toBe(1);
    expect(readingMinutesFor(Array(600).fill('kelime').join(' '))).toBe(3);
  });
});

describe('resolvePublishedAt', () => {
  const now = new Date('2026-08-29T10:00:00Z');
  const earlier = new Date('2026-08-01T10:00:00Z');
  const later = new Date('2026-09-15T10:00:00Z');
  it('stamps now on first publish and keeps it on later edits', () => {
    expect(
      resolvePublishedAt({ status: 'PUBLISHED', requested: undefined, current: null, now }),
    ).toBe(now);
    expect(
      resolvePublishedAt({ status: 'PUBLISHED', requested: undefined, current: earlier, now }),
    ).toBe(earlier);
  });
  it('lets an explicit date schedule or backdate, and null clears it', () => {
    expect(resolvePublishedAt({ status: 'PUBLISHED', requested: later, current: null, now })).toBe(
      later,
    );
    expect(
      resolvePublishedAt({ status: 'DRAFT', requested: null, current: earlier, now }),
    ).toBeNull();
  });
  it('keeps a prepared date on drafts without inventing one', () => {
    expect(
      resolvePublishedAt({ status: 'DRAFT', requested: undefined, current: null, now }),
    ).toBeNull();
    expect(
      resolvePublishedAt({ status: 'DRAFT', requested: undefined, current: earlier, now }),
    ).toBe(earlier);
  });
});

describe('tagSlug', () => {
  it('maps different spellings of the same tag to one URL', () => {
    expect(tagSlug('Doğum Günü')).toBe(tagSlug('dogum gunu'));
  });
});
