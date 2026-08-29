import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

const turkishMap: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
export function toTurkishSlug(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (letter) => turkishMap[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const fieldLabels: Record<string, string> = {
  name: 'Ad',
  slug: 'Kısa ad',
  title: 'Başlık',
  summary: 'Özet',
  description: 'Açıklama',
  body: 'İçerik',
  email: 'E-posta',
  password: 'Parola',
  categoryId: 'Kategori',
  conceptId: 'Konsept',
  eventTypeId: 'Etkinlik türü',
  imageUrls: 'Fotoğraflar',
  rightsConfirmed: 'Görsel hakkı beyanı',
  options: 'Seçenekler',
  reason: 'Neden',
  details: 'Açıklama',
  city: 'Şehir',
  venueType: 'Mekân türü',
  guestCount: 'Misafir sayısı',
  budgetMin: 'Minimum bütçe',
  budgetMax: 'Maksimum bütçe',
  heroImageUrl: 'Kapak görseli',
  heroImageAlt: 'Kapak alt metni',
};

/** Turns class-validator's English messages into short Turkish sentences for flash messages. */
export function translateValidationMessage(message: string): string {
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [
      /^(\w+) must be longer than or equal to (\d+) characters$/,
      (m) => `${label(m[1])} en az ${m[2]} karakter olmalı.`,
    ],
    [
      /^(\w+) must be shorter than or equal to (\d+) characters$/,
      (m) => `${label(m[1])} en fazla ${m[2]} karakter olabilir.`,
    ],
    [/^(\w+) should not be empty$/, (m) => `${label(m[1])} boş bırakılamaz.`],
    [/^(\w+) must be a string$/, (m) => `${label(m[1])} metin olmalı.`],
    [/^(\w+) must be a UUID$/, (m) => `${label(m[1])} seçimi geçersiz.`],
    [/^(\w+) must be an email$/, (m) => `${label(m[1])} geçerli bir e-posta olmalı.`],
    [/^(\w+) must be an integer number$/, (m) => `${label(m[1])} tam sayı olmalı.`],
    [/^(\w+) must be a number.*$/, (m) => `${label(m[1])} sayı olmalı.`],
    [/^(\w+) must not be less than (\d+)$/, (m) => `${label(m[1])} en az ${m[2]} olmalı.`],
    [/^(\w+) must not be greater than (\d+)$/, (m) => `${label(m[1])} en fazla ${m[2]} olabilir.`],
    [
      /^(\w+) must contain at least (\d+) elements$/,
      (m) => `${label(m[1])} için en az ${m[2]} öğe gerekli.`,
    ],
    [
      /^(\w+) must contain no more than (\d+) elements$/,
      (m) => `${label(m[1])} için en fazla ${m[2]} öğe eklenebilir.`,
    ],
    [/^(\w+) must be one of the following values: (.+)$/, (m) => `${label(m[1])} seçimi geçersiz.`],
    [/^(\w+) must be equal to true$/, (m) => `${label(m[1])} onaylanmalı.`],
    [/^(\w+) must be a boolean value$/, (m) => `${label(m[1])} evet/hayır olmalı.`],
    [/^property (\w+) should not exist$/, (m) => `${label(m[1])} alanı beklenmiyor.`],
  ];
  for (const [pattern, format] of rules) {
    const match = message.match(pattern);
    if (match) return format(match);
  }
  return message;
}

function label(field: string | undefined) {
  return field ? (fieldLabels[field] ?? field) : 'Alan';
}
