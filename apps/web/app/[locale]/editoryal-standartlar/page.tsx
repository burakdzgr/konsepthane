import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl, breadcrumbJsonLd } from '@ilham/seo';
import { asLocale, localeMetadata, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/editoryal-standartlar', {
    title: locale === 'tr' ? 'Editoryal Standartlar ve Kaynak Politikası' : 'Editorial Standards',
    description:
      locale === 'tr'
        ? 'Konsepthane içeriklerinin nasıl hazırlandığını, kaynakların nasıl seçildiğini ve topluluk içeriklerinin nasıl ayrıldığını öğrenin.'
        : 'How Konsepthane prepares editorial content, selects sources and distinguishes community contributions.',
  });
}

export default async function EditorialStandardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = asLocale((await params).locale);
  const p = (path: string) => localePath(locale, path);
  const isTurkish = locale === 'tr';
  const title = isTurkish
    ? 'Editoryal standartlar ve kaynak politikası'
    : 'Editorial standards and sourcing policy';
  const jsonLd = breadcrumbJsonLd([
    { name: isTurkish ? 'Ana sayfa' : 'Home', url: absoluteUrl(p('/')) },
    { name: title, url: absoluteUrl(p('/editoryal-standartlar')) },
  ]);

  return (
    <article className="wrap reading py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <p className="section-eyebrow">Konsepthane</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
      <p className="editorial-lead mt-6">
        {isTurkish
          ? 'Amacımız arama motorları için çoğaltılmış sayfalar üretmek değil; kutlama planlayan bir kişinin karar vermesini kolaylaştıran özgün, uygulanabilir ve açıkça kaynaklandırılmış içerikler sunmaktır.'
          : 'Our goal is not to multiply pages for search engines, but to publish original, practical and clearly sourced content that helps people make planning decisions.'}
      </p>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">
          {isTurkish ? 'İçerik türlerini nasıl ayırıyoruz?' : 'How we separate content types'}
        </h2>
        <div className="mt-5 space-y-4 text-base leading-8 text-[var(--muted)]">
          <p>
            <strong className="text-[var(--ink)]">
              {isTurkish ? 'Konsept ve rehber:' : 'Concept and guide:'}
            </strong>{' '}
            {isTurkish
              ? 'Editoryal ekip tarafından hazırlanır; başlık, görsel, uygulanabilir adımlar ve güncellik kontrolünden geçer.'
              : 'Prepared editorially and reviewed for clear headings, visuals, practical steps and freshness.'}
          </p>
          <p>
            <strong className="text-[var(--ink)]">{isTurkish ? 'Deneyim:' : 'Experience:'}</strong>{' '}
            {isTurkish
              ? 'Bir topluluk üyesinin gerçekten uyguladığı kutlamayı ve öğrendiklerini anlatır.'
              : 'Describes a celebration a community member actually carried out and what they learned.'}
          </p>
          <p>
            <strong className="text-[var(--ink)]">
              {isTurkish ? 'Soru ve yanıt:' : 'Question and answer:'}
            </strong>{' '}
            {isTurkish
              ? 'Topluluk katkısıdır; yalnızca yeterli, herkese açık ve onaylanmış sayfalar indekslenebilir.'
              : 'Community-contributed; only substantial, public and approved pages may be indexed.'}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">
          {isTurkish ? 'Kaynak hiyerarşimiz' : 'Our source hierarchy'}
        </h2>
        <p className="mt-4 text-base leading-8 text-[var(--muted)]">
          {isTurkish
            ? 'Sağlık, gıda güvenliği ve çocukların kişisel verileri gibi hassas konularda birincil ve resmi kaynaklara bağlantı veririz. Ticari bir sayfayı bağımsız kanıt gibi göstermeyiz; dış bağlantının neyi desteklediğini açıklayan bağlantı metni kullanırız.'
            : 'For sensitive topics such as health, food safety and children’s personal data, we link to primary official sources and describe what each link supports.'}
        </p>
        <ul className="mt-6 grid gap-3">
          {[
            ['Tarım ve Orman Bakanlığı Güvenilir Gıda', 'https://guvenilirgida.tarimorman.gov.tr/'],
            [
              'Sağlık Bakanlığı beslenme rehberleri',
              'https://hsgm.saglik.gov.tr/tr/component/content/article/beslenme.html?Itemid=188&catid=119',
            ],
            [
              'KVKK çocukların kişisel verileri duyurusu',
              'https://www.kvkk.gov.tr/Icerik/8666/cocuklarin-sosyal-medya-kullaniminda-kisisel-verilerinin-korunmasina-iliskin-kamuoyu-duyurusu',
            ],
            [
              'Google faydalı ve güvenilir içerik rehberi',
              'https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=tr',
            ],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-[var(--line)] bg-white p-4 font-semibold"
              >
                {label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-3xl bg-[#f7f3ec] p-6">
        <h2 className="font-serif text-3xl">
          {isTurkish ? 'Bağlantı ve düzeltme ilkesi' : 'Linking and corrections'}
        </h2>
        <p className="mt-4 leading-8 text-[var(--muted)]">
          {isTurkish
            ? 'Her editoryal sayfa, ait olduğu kategoriye ve ilgili deneyim ya da sorulara bağlanır. Kullanıcı katkılarındaki dış bağlantılar güven sinyali sayılmaz; gerektiğinde ugc ve nofollow nitelikleriyle işaretlenir. Hatalı veya güncelliğini yitirmiş bilgi fark edildiğinde içerik güncellenir ya da indeks dışına alınır.'
            : 'Editorial pages link to their category and related experiences or questions. User-submitted outbound links are not endorsements and are marked appropriately when rendered.'}
        </p>
      </section>

      <nav
        className="mt-10 flex flex-wrap gap-3"
        aria-label={isTurkish ? 'İlgili Konsepthane sayfaları' : 'Related Konsepthane pages'}
      >
        <Link href={p('/fikirler')} className="btn btn-primary">
          {isTurkish ? 'Konseptleri keşfet' : 'Explore concepts'}
        </Link>
        <Link href={p('/deneyimler')} className="btn btn-ghost">
          {isTurkish ? 'Gerçek deneyimleri incele' : 'Read real experiences'}
        </Link>
        <Link href={p('/sorular')} className="btn btn-ghost">
          {isTurkish ? 'Topluluk sorularına bak' : 'Browse questions'}
        </Link>
      </nav>
    </article>
  );
}
