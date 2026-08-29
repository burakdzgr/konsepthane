import { describe, expect, it } from 'vitest';
import { toTurkishSlug } from './index';

describe('toTurkishSlug', () => {
  it('normalizes Turkish characters and punctuation', () => {
    expect(toTurkishSlug('3 Yaş Kız Çocuk Doğum Günü Konsepti')).toBe(
      '3-yas-kiz-cocuk-dogum-gunu-konsepti',
    );
  });
});

import { translateValidationMessage } from './index';

describe('translateValidationMessage', () => {
  it('translates class-validator length messages', () => {
    expect(translateValidationMessage('name must be longer than or equal to 2 characters')).toBe(
      'Ad en az 2 karakter olmalı.',
    );
    expect(translateValidationMessage('imageUrls must contain at least 1 elements')).toBe(
      'Fotoğraflar için en az 1 öğe gerekli.',
    );
  });
  it('passes unknown messages through', () => {
    expect(translateValidationMessage('Bu kısa ad zaten kullanılıyor.')).toBe(
      'Bu kısa ad zaten kullanılıyor.',
    );
  });
});
