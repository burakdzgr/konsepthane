import type { Metadata } from 'next';
import { Card } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { asLocale, localeMetadata } from '@/lib/i18n';

/** Rendered statically and refreshed in the background; personal state comes from client islands. */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/topluluk-kurallari', {
    title: 'Topluluk Kuralları',
    description:
      "Konsepthane'de deneyim, soru ve görsel paylaşırken geçerli olan güvenlik, mahremiyet ve içerik ilkeleri.",
  });
}

export default function RulesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Güvenli topluluk"
        title="Topluluk kuralları"
        description="Konsepthane'yi faydalı, güvenli ve sıcak tutmak için ortak beklentilerimiz."
      />
      <article className="wrap reading py-8">
        <Card className="space-y-7 p-6 sm:p-8">
          <section>
            <h2 className="text-xl font-semibold">Deneyimini dürüstçe anlat</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">
              Sponsorlu veya ticari içerik niteliğini açıkça belirt. Başkasının deneyimini
              kendininmiş gibi sunma.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Mahremiyeti koru</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">
              Çocukların yüzü, okul bilgisi, adresi ve iletişim bilgileri gibi kişisel verileri
              izinsiz paylaşma. Ayrıntılı resmi çerçeve için{' '}
              <a
                href="https://www.kvkk.gov.tr/Icerik/8666/cocuklarin-sosyal-medya-kullaniminda-kisisel-verilerinin-korunmasina-iliskin-kamuoyu-duyurusu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--accent-strong)] underline"
              >
                KVKK'nın çocukların kişisel verileri duyurusunu
              </a>{' '}
              incele.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Görsel haklarına saygı göster</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">
              Yalnızca sahip olduğun, lisansladığın veya açık izin aldığın medyayı yükle; gereken
              atfı ekle.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Nazik ve konuya bağlı kal</h2>
            <p className="mt-2 leading-7 text-[var(--muted)]">
              Taciz, nefret, spam ve yanıltıcı yönlendirme kaldırılır. İtiraz ve moderasyon
              eylemleri kayıtlı iş akışıyla değerlendirilir.
            </p>
          </section>
        </Card>
      </article>
    </>
  );
}
