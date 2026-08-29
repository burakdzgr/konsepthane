import type { Locale } from '@/lib/i18n';

/**
 * Curated SEO landing pages: a category × topic combination that has real search demand AND
 * enough content gets a clean, permanent URL (`/kategori/<category>/<topic>`), its own editorial
 * introduction, self-canonical, sitemap entry and inbound links from the category and topic hubs.
 *
 * This registry is the only source of such pages — nothing is generated from arbitrary filter
 * combinations. Adding an entry is an editorial decision: write the intro (unique, useful text),
 * not a template. The page still runs the hub indexability policy at request time, so an entry
 * whose content disappears falls back to `noindex,follow` instead of a thin indexable page.
 */
export type LandingPage = {
  category: string;
  topic: string;
  /** Localised title/intro; only locales present here render the page (others 404). */
  locales: Partial<
    Record<
      Locale,
      {
        title: string;
        metaDescription: string;
        eyebrow: string;
        intro: string[];
      }
    >
  >;
};

export const landingPages: LandingPage[] = [
  {
    category: 'dogum-gunu',
    topic: '1-yas',
    locales: {
      tr: {
        title: '1 Yaş Doğum Günü Konseptleri',
        eyebrow: 'Doğum günü · 1 yaş',
        metaDescription:
          'İlk yaş doğum günü için editoryal konseptler, gerçek uygulama deneyimleri ve sık sorulan sorular: tema, renk paleti, pasta ve masa düzeni.',
        intro: [
          'İlk yaş kutlaması çoğu zaman çocuktan çok aile için bir hatıra günüdür: bebek uyku saatine göre kısa tutulan, fotoğraflarda güzel görünen ve misafirlerin rahat ettiği bir düzen aranır. Bu sayfada sadece 1 yaş için hazırlanmış konseptleri, aynı konsepti evde ya da salonda uygulayan ailelerin fotoğraflı deneyimlerini ve planlarken sorulan soruları bir arada bulursun.',
          'Konseptleri seçerken üç ölçüt kullandık: kurulumun iki saatten kısa sürmesi, bebek için güvenli malzeme (küçük parça ve helyum balon uyarılarıyla) ve tek odak duvarıyla fotoğraf verimliliği.',
        ],
      },
    },
  },
  {
    category: 'dogum-gunu',
    topic: 'ayicik',
    locales: {
      tr: {
        title: 'Ayıcık Temalı Doğum Günü Konseptleri',
        eyebrow: 'Doğum günü · ayıcık teması',
        metaDescription:
          'Ayıcık temalı doğum günü için krem-kahve paletli konseptler, masa düzeni ve pasta fikirleri; gerçek uygulama fotoğrafları ve arka fon, pasta boyutu gibi pratik sorular.',
        intro: [
          'Ayıcık teması, 1–3 yaş kutlamalarında en çok tercih edilen temalardan biri; sıcak tonları her mekânda çalışır ve tek bir figürle güçlü bir odak yaratır. Burada ayıcık temasına uyarlanmış konseptler, tema için yapılmış gerçek kutlamalar ve “arka fon kaç metre olmalı”, “pasta hangi tonda olmalı” gibi sorular toplanıyor.',
          'Renk paletini bej–krem–kakao üçlüsünde tutmak ve ayıcığı yalnızca pasta ile fon panosunda kullanmak, temayı abartmadan taşımanın en ekonomik yolu.',
        ],
      },
    },
  },
  {
    category: 'dogum-gunu',
    topic: 'evde-kutlama',
    locales: {
      tr: {
        title: 'Evde Doğum Günü Konseptleri',
        eyebrow: 'Doğum günü · evde',
        metaDescription:
          'Evde doğum günü için alan planı, tek odak duvarı ve yeniden kullanılabilir malzemeyle hazırlanmış konseptler; evde uygulayan ailelerin deneyimleri ve hazırlık planı.',
        intro: [
          'Evde kutlama, mekân kirası olmadığı için bütçeyi süsleme ve ikrama kaydırır; ama alan dar olduğundan plan daha önemli hale gelir. Bu sayfadaki konseptler 20–40 m² salonlarda tek odak duvarı, katlanır masa ve önceden hazırlanan ikram düzeniyle test edildi.',
          'Evde uygulayanların deneyimleri, kurulum süresi ve “ne farklı yapardım” notlarıyla birlikte listeleniyor; 48 saatlik hazırlık planı rehberi de buradan ulaşılabilir.',
        ],
      },
    },
  },
];

export function findLandingPage(category: string, topic: string) {
  return landingPages.find((entry) => entry.category === category && entry.topic === topic);
}

export function landingPagesForCategory(category: string) {
  return landingPages.filter((entry) => entry.category === category);
}

export function landingPagesForTopic(topic: string) {
  return landingPages.filter((entry) => entry.topic === topic);
}
