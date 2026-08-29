import { describe, expect, it } from 'vitest';
import { shouldIndexHub } from './index';

const description = 'Ayıcık temalı kutlamalar için renk paleti, masa düzeni ve pasta fikirleri.';

describe('shouldIndexHub', () => {
  it('never indexes an empty hub', () => {
    expect(shouldIndexHub({ counts: {} }).indexable).toBe(false);
  });

  it('indexes a small but real hub: 2 concepts + description + images', () => {
    const decision = shouldIndexHub({
      counts: { concepts: 2 },
      description,
      imageCount: 2,
    });
    expect(decision.indexable).toBe(true);
    expect(decision.reasons).toContain('editorial_description');
  });

  it('does not index a list dump of 3 items without editorial text or images', () => {
    const decision = shouldIndexHub({ counts: { questions: 3 } });
    expect(decision.indexable).toBe(false);
    expect(decision.reasons).toContain('thin_description');
  });

  it('rewards mixed content types and link support', () => {
    const decision = shouldIndexHub({
      counts: { concepts: 1, experiences: 1, questions: 1 },
      description,
      imageCount: 1,
      featured: true,
    });
    expect(decision.indexable).toBe(true);
    expect(decision.reasons).toContain('content_types:3');
  });

  it('respects editorial overrides and duplicate detection', () => {
    expect(shouldIndexHub({ counts: { concepts: 9 }, override: 'NOINDEX' }).indexable).toBe(false);
    expect(shouldIndexHub({ counts: {}, override: 'INDEX' }).indexable).toBe(true);
    expect(
      shouldIndexHub({ counts: { concepts: 9 }, description, isDuplicateOf: 'dogum-gunu' })
        .indexable,
    ).toBe(false);
  });
});
