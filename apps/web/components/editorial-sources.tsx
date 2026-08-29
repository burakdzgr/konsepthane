import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { localePath } from '@/lib/i18n';

const officialSources = [
  {
    href: 'https://guvenilirgida.tarimorman.gov.tr/',
    title: 'Tarım ve Orman Bakanlığı Güvenilir Gıda',
    description: 'Gıda seçimi, etiket, saklama ve tüketici güvenliği bilgileri.',
  },
  {
    href: 'https://hsgm.saglik.gov.tr/tr/component/content/article/beslenme.html?Itemid=188&catid=119',
    title: 'Sağlık Bakanlığı beslenme rehberleri',
    description: 'Çocuklar ve farklı yaş grupları için resmi beslenme başlıkları.',
  },
  {
    href: 'https://www.kvkk.gov.tr/Icerik/8666/cocuklarin-sosyal-medya-kullaniminda-kisisel-verilerinin-korunmasina-iliskin-kamuoyu-duyurusu',
    title: 'KVKK çocukların kişisel verileri duyurusu',
    description: 'Çocuk fotoğrafları ve kişisel veriler için güncel resmi çerçeve.',
  },
] as const;

export const officialEditorialSourceUrls = officialSources.map((source) => source.href);

export function EditorialSources({ locale }: { locale: Locale }) {
  const isTurkish = locale === 'tr';
  return (
    <aside
      className="mt-12 rounded-3xl border border-[var(--line)] bg-[#faf7f2] p-6"
      aria-labelledby="kaynaklar-baslik"
    >
      <p className="section-eyebrow">{isTurkish ? 'Kaynak kontrolü' : 'Source check'}</p>
      <h2 id="kaynaklar-baslik" className="mt-2 font-serif text-2xl">
        {isTurkish ? 'Planlarken güvenilir kaynaklar' : 'Trusted sources for planning'}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {isTurkish
          ? 'Konsept önerileri ilham amaçlıdır. Gıda, sağlık ve çocukların dijital mahremiyetiyle ilgili kararlarında resmi kaynakları kontrol et.'
          : 'Concept suggestions are for inspiration. Check official sources when making food, health or child privacy decisions.'}
      </p>
      <ul className="mt-5 grid gap-3">
        {officialSources.map((source) => (
          <li key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-white p-4 text-sm"
            >
              <strong className="block text-[var(--ink)]">{source.title} ↗</strong>
              <span className="mt-1 block leading-6 text-[var(--muted)]">{source.description}</span>
            </a>
          </li>
        ))}
      </ul>
      <Link
        href={localePath(locale, '/editoryal-standartlar')}
        className="mt-5 inline-flex text-sm font-semibold text-[var(--accent-strong)]"
      >
        {isTurkish
          ? 'Konsepthane içerik ve kaynak politikası →'
          : 'Konsepthane content and sourcing policy →'}
      </Link>
    </aside>
  );
}
