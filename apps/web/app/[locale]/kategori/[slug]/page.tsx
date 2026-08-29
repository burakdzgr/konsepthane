import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb, EmptyState, ExperienceCard, Icon, Pagination, QuestionCard } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from '@ilham/seo';
import { ConceptGrid } from '@/components/concept-discovery';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { landingPagesForCategory } from '@/content/landing-pages';
import { getCategory, getConceptsPage } from '@/lib/api';
import { getExperiences, getQuestions } from '@/lib/community';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { DEFAULT_PAGE_SIZE, pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';
import { redirectIfLegacyPath } from '@/lib/seo';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam, slug }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const category = await getCategory(slug);
  if (!category) return {};
  const page = parsePage(sayfa);
  const base = `/kategori/${category.slug}`;
  const suffix = getDictionary(locale).pages.pagination.titleSuffix;
  if (page > 1) {
    return pagedMetadata(
      locale,
      base,
      page,
      {
        title: `${category.name} Fikirleri`,
        description: category.description ?? `${category.name} konseptleri ve planlama fikirleri.`,
      },
      suffix,
    );
  }
  return localeMetadata(locale, base, {
    title: `${category.name} Fikirleri`,
    description: category.description ?? `${category.name} konseptleri ve planlama fikirleri.`,
    openGraph: {
      title: `${category.name} Fikirleri`,
      description: category.description ?? `${category.name} konseptleri ve planlama fikirleri.`,
      ...(category.concepts[0]?.heroImageUrl
        ? {
            images: [
              {
                url: category.concepts[0].heroImageUrl,
                alt: category.concepts[0].heroImageAlt ?? category.concepts[0].title,
              },
            ],
          }
        : {}),
    },
  });
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const [{ locale: localeParam, slug }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const category = await getCategory(slug);
  if (!category) {
    await redirectIfLegacyPath(locale, `/kategori/${slug}`);
    notFound();
  }
  const page = parsePage(sayfa);
  const [conceptPage, experiences, questions] = await Promise.all([
    getConceptsPage({
      category: category.slug,
      sort: 'popular',
      pageSize: DEFAULT_PAGE_SIZE,
      page,
    }),
    getExperiences({ eventType: category.slug, pageSize: 6 }),
    getQuestions({ tab: 'popular' }),
  ]);
  const meta = pageMeta(conceptPage.meta, page, DEFAULT_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  const concepts = conceptPage.data;
  const list = concepts.length ? concepts : category.concepts;
  const hero = list[0];
  const relatedQuestions = questions
    .filter((question) => question.eventType?.slug === category.slug || !question.eventType)
    .slice(0, 3);
  const path = p(`/kategori/${category.slug}`);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Ana sayfa', url: absoluteUrl(p('/')) },
      { name: category.name, url: absoluteUrl(path) },
    ]),
    itemListJsonLd({
      url: absoluteUrl(path),
      name: `${category.name} konseptleri`,
      items: list.map((item) => ({
        name: item.title,
        url: absoluteUrl(p(`/konsept/${item.slug}`)),
      })),
    }),
  ];
  return (
    <div className="wrap py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Breadcrumb items={[{ label: 'Ana sayfa', href: p('/') }, { label: category.name }]} />
      {landingPagesForCategory(category.slug).some((entry) => entry.locales[locale]) && (
        <nav className="filter-chips mt-5" aria-label={dictionary.pages.landing.subpagesEyebrow}>
          {landingPagesForCategory(category.slug)
            .filter((entry) => entry.locales[locale])
            .map((entry) => (
              <Link key={entry.topic} href={p(`/kategori/${entry.category}/${entry.topic}`)}>
                {entry.locales[locale]!.title}
              </Link>
            ))}
        </nav>
      )}
      <header className="category-hero mt-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[var(--accent-strong)]">
            Etkinlik rehberi
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] tracking-[-.045em] sm:text-6xl">
            {category.name} fikirleri
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            {category.description}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={p(`/fikirler?kategori=${category.slug}`)} className="btn btn-primary">
              {list.length} konsepti keşfet
            </Link>
            <Link href={p(`/deneyimler?etkinlik=${category.slug}`)} className="btn btn-ghost">
              Gerçek deneyimler
            </Link>
          </div>
        </div>
        {hero && (
          <Link
            href={p(`/konsept/${hero.slug}`)}
            aria-label={hero.title}
            className="img-frame aspect-[4/3] rounded-[var(--radius-xl)]"
          >
            <SmartImage
              src={hero.heroImageUrl ?? '/placeholders/minimal-concept.svg'}
              alt={hero.heroImageAlt ?? hero.title}
              sizes="(max-width: 1024px) 100vw, 560px"
              priority
            />
          </Link>
        )}
      </header>

      <section aria-labelledby="fikirler" className="mt-14">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Editoryal konseptler</p>
            <h2 id="fikirler">Öne çıkan konseptler</h2>
          </div>
          <Link href={p(`/fikirler?kategori=${category.slug}&sirala=new`)}>
            En yeniler <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {list.length ? (
          <>
            <ConceptGrid concepts={list} returnTo={path} className="mt-7 card-grid-4" />
            <Pagination
              page={meta.page}
              pageCount={meta.pageCount}
              href={(n) => p(pageHref(`/kategori/${category.slug}`, n))}
              labels={dictionary.pages.pagination}
              LinkComponent={Link}
            />
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Seçki hazırlanıyor"
              description="Editörlerimiz bu kategori için uygulanabilir fikirleri değerlendiriyor."
            />
          </div>
        )}
      </section>

      {experiences.length > 0 && (
        <section className="mt-16">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Siz nasıl yaptınız?</p>
              <h2>Gerçek {category.name.toLocaleLowerCase('tr-TR')} deneyimleri</h2>
            </div>
            <Link href={p(`/deneyimler?etkinlik=${category.slug}`)}>
              Tümünü gör <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="mt-7 card-grid-4">
            {experiences.map((item) => (
              <ExperienceCard
                LinkComponent={Link}
                ImageComponent={SmartImage}
                imageSizes={cardSizes}
                key={item.id}
                title={item.title}
                summary={item.summary ?? item.body}
                href={p(`/deneyim/${item.slug}`)}
                imageUrl={
                  item.images[0]?.url ?? item.heroImageUrl ?? '/placeholders/home-birthday.svg'
                }
                imageAlt={item.images[0]?.altText ?? item.title}
                authorName={item.author.profile?.displayName ?? 'Topluluk üyesi'}
                authorAvatarUrl={item.author.profile?.avatarUrl}
                meta={[item.ageLabel, item.themeVariation, item.venueType]
                  .filter(Boolean)
                  .join(' · ')}
                reactions={item.reactionCount}
                comments={item.commentCount}
              />
            ))}
          </div>
        </section>
      )}

      {relatedQuestions.length > 0 && (
        <section className="mt-16 max-w-4xl">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Topluluğa danış</p>
              <h2>Sık sorulanlar</h2>
            </div>
            <Link href={p('/sorular')}>
              Tüm sorular <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="mt-7 space-y-4">
            {relatedQuestions.map((question) => (
              <QuestionCard
                LinkComponent={Link}
                ImageComponent={SmartImage}
                key={question.id}
                title={question.title}
                summary={question.body}
                href={p(`/soru/${question.slug}`)}
                imageUrl={question.images?.[0]?.url}
                authorName={question.author.profile?.displayName}
                username={question.author.profile?.username}
                reactions={question.reactionCount}
                responses={question.answerCount}
                meta={question.concept ? `İlgili: ${question.concept.title}` : 'Topluluk sorusu'}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
