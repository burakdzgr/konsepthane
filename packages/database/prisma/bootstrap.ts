/**
 * Structural data the site needs to run — no content, no members. Idempotent (upserts), so it is
 * safe on an empty launch database and on an existing one (re-syncs the RBAC matrix, adds any
 * taxonomy rows that are missing, never deletes categories/topics that editors may have renamed).
 *
 *   pnpm --filter @ilham/database bootstrap
 *
 * Used by `reset:launch` (fresh database → admin) and by the local sample seed.
 */
import { ContentStatus, PrismaClient, TopicKind } from '@prisma/client';
import { PERMISSION_KEYS, ROLE_KEYS, ROLE_NAMES, rolePermissions } from '../src';

export function slugify(value: string) {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (letter) => map[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const categories = [
  ['Doğum Günü', 'dogum-gunu', 'Her yaş için tema, süsleme ve planlama fikirleri.'],
  [
    'Baby Shower',
    'baby-shower',
    'Bebeği karşılamaya hazırlanırken zarif ve uygulanabilir fikirler.',
  ],
  ['Nişan', 'nisan', 'Nişan masası, dekorasyon ve davet ilhamı.'],
  ['Söz', 'soz', 'Evde ve mekânda söz organizasyonu fikirleri.'],
  ['Kına', 'kina', 'Modern ve geleneksel kına gecesi planları.'],
  ['Bekarlığa Veda', 'bekarliga-veda', 'Samimi kutlamalardan hafta sonu planlarına seçkiler.'],
  ['Cinsiyet Partisi', 'cinsiyet-partisi', 'Sürprizi öne çıkaran dengeli kutlama konseptleri.'],
  ['Diş Buğdayı', 'dis-bugdayi', 'İlk diş kutlaması için masa ve ikram fikirleri.'],
] as const;

const eventTypes = [
  'Doğum Günü',
  'Baby Shower',
  'Nişan',
  'Söz',
  'Kına',
  'Bekarlığa Veda',
  'Cinsiyet Partisi',
  'Diş Buğdayı',
];
const themes = ['Safari', 'Kelebek', 'Ayıcık', 'Prenses', 'Futbol', 'Boho', 'Minimal', 'Okyanus'];
const colors = [
  ['Pembe', '#E9A6B5'],
  ['Mavi', '#8CB9D8'],
  ['Bej', '#D8C7AE'],
  ['Yeşil', '#7A9B76'],
  ['Altın', '#C7A24A'],
  ['Mor', '#9B7BB5'],
] as const;

/** Header topic strip + hub pages: every chip maps to a real topic (`/konu/<slug>`). */
const topics = [
  ['Doğum Günü', 'dogum-gunu', TopicKind.EVENT_TYPE, true, 'Doğum günü planlama topluluğu.'],
  ['1 Yaş', '1-yas', TopicKind.AGE, true, 'İlk yaş kutlaması fikirleri.'],
  ['2 Yaş', '2-yas', TopicKind.AGE, true, 'İki yaş kutlamaları için tema ve oyun fikirleri.'],
  ['3 Yaş', '3-yas', TopicKind.AGE, true, 'Üç yaş için oyun ve tema fikirleri.'],
  ['5–7 Yaş', '5-7-yas', TopicKind.AGE, false, 'Okul dönemi çocukları için kutlamalar.'],
  ['Kız Çocuk', 'kiz-cocuk', TopicKind.THEME, true, 'Kız çocukları için tema ve renk fikirleri.'],
  [
    'Erkek Çocuk',
    'erkek-cocuk',
    TopicKind.THEME,
    true,
    'Erkek çocukları için tema ve renk fikirleri.',
  ],
  ['Safari', 'safari', TopicKind.THEME, true, 'Doğal tonlarda safari teması.'],
  ['Ayıcık', 'ayicik', TopicKind.THEME, true, 'Ayıcık temalı kutlama konseptleri.'],
  ['Minimal', 'minimal', TopicKind.THEME, true, 'Sade ve tekrar kullanılabilir düzenler.'],
  ['Evde Kutlama', 'evde-kutlama', TopicKind.FORMAT, true, 'Ev ortamına uygun planlar.'],
  ['Düşük Bütçe', 'dusuk-butce', TopicKind.BUDGET, true, 'Bütçe dostu alternatifler.'],
  ['Pastel Renkler', 'pastel-renkler', TopicKind.COLOR, false, 'Yumuşak renk paletleri.'],
  ['Pastalar', 'pastalar', TopicKind.GENERAL, true, 'Pasta tasarımı, boyut ve servis fikirleri.'],
  [
    'Balon & Dekor',
    'balon-dekor',
    TopicKind.GENERAL,
    true,
    'Balon düzenlemeleri ve dekor fikirleri.',
  ],
  ['Masa Süsleme', 'masa-susleme', TopicKind.GENERAL, true, 'Masa düzeni ve süsleme fikirleri.'],
  ['Oyunlar', 'oyunlar', TopicKind.GENERAL, false, 'Yaşa uygun etkinlik ve oyunlar.'],
  ['İkram', 'ikram', TopicKind.GENERAL, false, 'Menü, pasta ve servis fikirleri.'],
  ['Yağmurlu Gün', 'yagmurlu-gun', TopicKind.GENERAL, false, 'Kapalı alanda B planı.'],
] as const;

const featureFlags = [
  ['ugc_enabled', true],
  ['affiliate_enabled', false],
  ['vendor_marketplace_enabled', false],
  ['ads_enabled', false],
  ['comments_enabled', true],
  ['registrations_enabled', true],
  ['commerce_enabled', false],
  ['shoppable_images_enabled', false],
  ['ai_concept_planner_enabled', false],
  ['lead_generation_enabled', false],
  ['sponsored_content_enabled', false],
] as const;

export async function bootstrapStructure(prisma: PrismaClient) {
  const permissionRows = await Promise.all(
    PERMISSION_KEYS.map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: `${key} yetkisi` },
      }),
    ),
  );
  for (const key of ROLE_KEYS) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: ROLE_NAMES[key] },
      create: { key, name: ROLE_NAMES[key] },
    });
    const granted = new Set<string>(rolePermissions(key));
    const allowed = permissionRows.filter((item) => granted.has(item.key));
    // Role grants are authoritative: stale permissions are revoked, missing ones added.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: allowed.map((item) => item.id) } },
    });
    await prisma.rolePermission.createMany({
      data: allowed.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }

  for (const [name, slug, description] of categories)
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, description, status: ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
  for (const name of eventTypes)
    await prisma.eventType.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  for (const name of themes)
    await prisma.eventTheme.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
  for (const [name, hex] of colors)
    await prisma.color.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), hex },
    });
  for (const [name, slug, kind, featured, description] of topics)
    await prisma.topic.upsert({
      where: { slug },
      update: {},
      create: { name, slug, kind, featured, description },
    });
  for (const [key, enabled] of featureFlags)
    await prisma.featureFlag.upsert({ where: { key }, update: {}, create: { key, enabled } });

  return {
    roles: await prisma.role.count(),
    permissions: await prisma.permission.count(),
    categories: await prisma.category.count(),
    eventTypes: await prisma.eventType.count(),
    topics: await prisma.topic.count(),
    featureFlags: await prisma.featureFlag.count(),
  };
}

// `tsx prisma/bootstrap.ts` → run standalone.
if (process.argv[1]?.endsWith('bootstrap.ts')) {
  const prisma = new PrismaClient();
  void bootstrapStructure(prisma)
    .then((counts) => console.log('bootstrap', counts))
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
