import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb, Card, Icon, UserMiniProfile } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from '@ilham/seo';
import { Flash, OwnerGate } from '@/components/engagement';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { removeCollectionItemAction } from '@/lib/actions';
import { getPublicCollection } from '@/lib/community';
import { getPublicCollections } from '@/lib/community';
import { asLocale, localeMetadata, localePath } from '@/lib/i18n';

/** Rendered statically and refreshed in the background; personal state comes from client islands. */
export const revalidate = 300;
export const dynamicParams = true;

/** Prebuilds the indexable slugs at deploy time; new ones render on first request. */
export async function generateStaticParams() {
  const items = await getPublicCollections(50);
  return items.map((item) => ({ locale: 'tr', slug: item.slug }));
}

const typeLabels: Record<string, string> = {
  INSPIRATION: 'Konsept',
  GUIDE: 'Rehber',
  EVENT_EXPERIENCE: 'Deneyim',
  QUESTION: 'Soru',
};

function isIndexableCollection(item: { itemCount: number; description: string | null }) {
  return item.itemCount >= 3 && (item.description?.trim().length ?? 0) >= 60;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const item = await getPublicCollection(slug);
  if (!item) return {};
  const description =
    item.description ?? 'Topluluğun kutlama planı için bir araya getirdiği konsept ve deneyimler.';
  const images = [item.coverImageUrl, ...item.items.map((entry) => entry.content?.imageUrl)].filter(
    Boolean,
  ) as string[];
  return localeMetadata(locale, `/koleksiyon/${item.slug}`, {
    title: item.title,
    description,
    indexable: isIndexableCollection(item),
    openGraph: {
      title: item.title,
      description,
      images: images[0] ? [{ url: images[0], alt: `${item.title} koleksiyonu` }] : [],
    },
  });
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const item = await getPublicCollection((await params).slug);
  if (!item) notFound();
  const entries = item.items.filter((entry) => entry.content);
  const collageImages = [
    item.coverImageUrl,
    ...entries.map((entry) => entry.content?.imageUrl),
  ].filter(Boolean) as string[];
  const path = p(`/koleksiyon/${item.slug}`);
  const structuredData = [
    breadcrumbJsonLd([
      { name: 'Ana sayfa', url: absoluteUrl(p('/')) },
      { name: 'Fikirler', url: absoluteUrl(p('/fikirler')) },
      { name: item.title, url: absoluteUrl(path) },
    ]),
    itemListJsonLd({
      url: absoluteUrl(path),
      name: item.title,
      items: entries.map((entry) => ({
        name: entry.content!.title,
        url: absoluteUrl(p(entry.content!.href)),
      })),
    }),
  ];

  return (
    <div className="wrap py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumb
        items={[
          { label: 'Ana sayfa', href: p('/') },
          { label: 'Fikirler', href: p('/fikirler') },
          { label: item.title },
        ]}
      />
      <header className="mt-7 grid items-end gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="section-eyebrow">Görsel planlama panosu</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-[-.04em] sm:text-5xl">
            {item.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)]">
            {item.description ?? 'Topluluk üyesinin kutlama için bir araya getirdiği fikirler.'}
          </p>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <UserMiniProfile
              name={item.owner.profile?.displayName ?? 'Topluluk üyesi'}
              username={item.owner.profile?.username}
              meta={`${item.itemCount} kayıtlı fikir`}
            />
            <Link
              href={p('/kaydedilenler')}
              className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
            >
              Kendi panonu kur
            </Link>
          </div>
        </div>
        <div className="collection-hero-collage">
          {(collageImages.length ? collageImages : ['/placeholders/teddy-concept.svg'])
            .slice(0, 3)
            .map((src, index) => (
              <span key={`${src}-${index}`} className="img-frame">
                <SmartImage
                  src={src}
                  alt=""
                  sizes="(max-width: 1024px) 60vw, 520px"
                  priority={index === 0}
                />
              </span>
            ))}
        </div>
      </header>

      <section className="mt-14">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Panodaki seçimler</p>
            <h2>{entries.length} ilham noktası</h2>
          </div>
          <Link href={p('/kaydedilenler')}>
            Kendi panonu oluştur <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <OwnerGate username={item.owner.profile?.username}>
          <Flash />
          <p className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper-2)] px-4 py-3 text-sm">
            <span>Bu senin panon — içerikleri kartlardan çıkarabilirsin.</span>
            <Link href={p(`/pano/${item.slug}`)} className="community-action">
              <Icon name="arrow-right" size={14} /> Panoyu düzenle
            </Link>
          </p>
        </OwnerGate>
        <div className="collection-detail-grid mt-7">
          {entries.map((entry) => (
            <Card key={entry.id} className="group overflow-hidden shadow-none">
              <Link href={p(entry.content!.href)} className="block">
                <div className="img-frame aspect-[4/3] bg-[var(--surface-stone)]">
                  <SmartImage
                    src={entry.content!.imageUrl ?? '/placeholders/minimal-concept.svg'}
                    alt={`${entry.content!.title} görseli`}
                    sizes={cardSizes}
                    className="transition duration-300 group-hover:scale-[1.025]"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--accent-strong)]">
                    {typeLabels[entry.entityType] ?? 'Fikir'}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight">
                    {entry.content!.title}
                  </h2>
                  {entry.content!.summary && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                      {entry.content!.summary}
                    </p>
                  )}
                </div>
              </Link>
              <OwnerGate username={item.owner.profile?.username}>
                <form action={removeCollectionItemAction} className="px-5 pb-5">
                  <input type="hidden" name="collectionId" value={item.id} />
                  <input type="hidden" name="itemId" value={entry.id} />
                  <input type="hidden" name="returnTo" value={path} />
                  <button type="submit" className="community-action is-remove">
                    <Icon name="x" size={12} /> Panodan çıkar
                  </button>
                </form>
              </OwnerGate>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
