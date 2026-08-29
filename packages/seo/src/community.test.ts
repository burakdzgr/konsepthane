import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  evaluateCommunityIndexability,
  organizationJsonLd,
  qaPageJsonLd,
  discussionForumJsonLd,
  websiteJsonLd,
} from './index';

describe('site identity SEO', () => {
  it('normalizes absolute URLs without losing locale paths', () => {
    expect(absoluteUrl('/tr/konsept/ornek', 'https://konsepthane.test/')).toBe(
      'https://konsepthane.test/tr/konsept/ornek',
    );
  });

  it('keeps the site and organization names consistent', () => {
    const url = 'https://konsepthane.test/';
    expect(websiteJsonLd({ url }).name).toBe('Konsepthane');
    expect(organizationJsonLd({ url, logoUrl: `${url}logo.svg` }).name).toBe('Konsepthane');
  });
});

describe('community structured data', () => {
  it('emits a forum posting only when the required publication date exists', () => {
    const base = {
      url: 'https://konsepthane.test/tr/tartisma/ornek',
      headline: 'Kutlama masasında sadeleşme işe yarıyor mu?',
      text: 'Topluluğun farklı deneyimleri karşılaştırdığı özgün tartışma metni.',
      authorName: 'Topluluk üyesi',
    };
    expect(discussionForumJsonLd(base)).toBeNull();
    expect(
      discussionForumJsonLd({ ...base, datePublished: '2026-08-28T10:00:00.000Z' })?.['@type'],
    ).toBe('DiscussionForumPosting');
  });
});

describe('community SEO quality gate', () => {
  it('indexes only substantial approved public content', () => {
    expect(
      evaluateCommunityIndexability({
        title: 'Evde doğum günü planı',
        body: 'Uygulanabilir ve özgün bir topluluk anlatımı. '.repeat(5),
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
        canonicalPath: '/soru/ornek',
      }).indexable,
    ).toBe(true);
  });
  it('keeps thin or unreviewed content out of the index', () => {
    const result = evaluateCommunityIndexability({
      title: 'Kısa',
      body: 'İnce içerik',
      visibility: 'PUBLIC',
      moderationStatus: 'SUBMITTED',
      canonicalPath: '/soru/kisa',
    });
    expect(result.indexable).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['not_approved', 'thin_title', 'thin_body']),
    );
  });
  it('emits QAPage only when answers exist', () => {
    expect(
      qaPageJsonLd({
        question: 'Soru',
        body: 'Gövde',
        url: 'https://example.com/soru',
        answers: [],
      }),
    ).toBeNull();
    expect(
      qaPageJsonLd({
        question: 'Soru',
        body: 'Gövde',
        url: 'https://example.com/soru',
        answers: [{ body: 'Yanıt', accepted: true }],
      })?.['@type'],
    ).toBe('QAPage');
  });
});
