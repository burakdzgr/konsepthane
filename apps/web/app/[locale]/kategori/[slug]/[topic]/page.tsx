import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb, ContentTypeBadge, EmptyState, ExperienceCard, Icon } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd, shouldIndexHub } from '@ilham/seo';
import { ConceptGrid } from '@/components/concept-discovery';
import { PageHeader } from '@/components/community-layout';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { findLandingPage } from '@/content/landing-pages';
import { getCategory, getConcepts } from '@/lib/api';
import { getTopic } from '@/lib/community';
import { asLocale, getDictionary, localeMetadata, localePath, type Locale } from '@/lib/i18n';

async function loadLanding(locale: Locale, categorySlug: string, topicSlug: string) {
  const entry = findLandingPage(categorySlug, topicSlug);
  const copy = entry?.locales[locale];
  if (!entry || !copy) return null;
  const [category, topic, concepts] = await Promise.all([
    getCategory(categorySlug),
    getTopic(topicSlug),
    getConcepts({ category: categorySlug, sort: 'popular', pageSize: 100 }),
  ]);
  if (!category || !topic) return null;
  const topicItems = topic.items ?? [];
  const topicConceptSlugs = new Set(
    topicItems
      .filter((item) => item.type === 'INSPIRATION')
      .map((item) => item.href.split('/').pop()),
  );
  const conceptList = concepts.filter((concept) => topicConceptSlugs.has(concept.slug));
  const experiences = topicItems.filter((item) => item.type === 'EVENT_EXPERIENCE');
  const questions = topicItems.filter((item) => item.type === 'QUESTION');
  const guides = topicItems.filter((item) => item.type === 'GUIDE');
  const decision = shouldIndexHub({
    counts: {
      concepts: conceptList.length,
      experiences: experiences.length,
      questions: questions.length,
      guides: guides.length,
    },
    description: copy.intro.join(' '),
    imageCount:
      conceptList.filter((concept) => concept.heroImageUrl).length +
      experiences.filter((item) => item.imageUrl).length,
    featured: true,
  });
  return { entry, copy, category, topic, conceptList, experiences, questions, guides, decision };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; topic: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug, topic } = await params;
  const locale = asLocale(localeParam);
  const data = await loadLanding(locale, slug, topic);
  if (!data) return {};
  const path = `/kategori/${slug}/${topic}`;
  return localeMetadata(locale, path, {
    title: data.copy.title,
    description: data.copy.metaDescription,
    indexable: data.decision.indexable,
    openGraph: {
      title: data.copy.title,
      description: data.copy.metaDescription,
      ...(data.conceptList[0]?.heroImageUrl
        ? {
            images: [
              {
                url: data.conceptList[0].heroImageUrl,
                alt: data.conceptList[0].heroImageAlt ?? data.conceptList[0].title,
              },
            ],
          }
        : {}),
    },
  });
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; topic: string }>;
}) {
  const { locale: localeParam, slug, topic: topicSlug } = await params;
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.landing;
  const p = (value: string) => localePath(locale, value);
  const data = await loadLanding(locale, slug, topicSlug);
  if (!data) notFound();
  const { copy, category, topic, conceptList, experiences, questions, guides } = data;
  const path = p(`/kategori/${slug}/${topicSlug}`);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: dictionary.nav.home, url: absoluteUrl(p('/')) },
      { name: category.name, url: absoluteUrl(p(`/kategori/${category.slug}`)) },
      { name: copy.title, url: absoluteUrl(path) },
    ]),
    ...(conceptList.length
      ? [
          itemListJsonLd({
            url: absoluteUrl(path),
            name: copy.title,
            items: conceptList.map((concept) => ({
              name: concept.title,
              url: absoluteUrl(p(`/konsept/${concept.slug}`)),
            })),
          }),
        ]
      : []),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.metaDescription} />
      <div className="wrap py-8">
        <Breadcrumb
          label={dictionary.pages.breadcrumbLabel}
          items={[
            { label: dictionary.nav.home, href: p('/') },
            { label: category.name, href: p(`/kategori/${category.slug}`) },
            { label: copy.title },
          ]}
        />
        <div className="prose-trust mt-8 max-w-3xl">
          {copy.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <section className="mt-12">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.conceptsEyebrow}</p>
              <h2>{t.conceptsTitle(copy.title)}</h2>
            </div>
            <Link href={p(`/konu/${topic.slug}`)}>
              {t.allInTopic(topic.name)} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {conceptList.length ? (
            <ConceptGrid concepts={conceptList} returnTo={path} className="mt-7 card-grid-4" />
          ) : (
            <div className="mt-6">
              <EmptyState title={t.empty} description={t.emptyText} />
            </div>
          )}
        </section>

        {experiences.length > 0 && (
          <section className="mt-14">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">{t.experiencesEyebrow}</p>
                <h2>{t.experiencesTitle}</h2>
              </div>
            </div>
            <div className="card-grid-4 mt-7">
              {experiences.slice(0, 8).map((item) => (
                <ExperienceCard
                  key={item.id}
                  title={item.title}
                  summary={item.summary ?? ''}
                  href={p(item.href)}
                  imageUrl={item.imageUrl ?? '/placeholders/home-birthday.svg'}
                  imageAlt={item.title}
                  authorName={dictionary.cards.communityMember}
                  meta={item.meta ?? ''}
                  badge={dictionary.cards.realParty}
                  LinkComponent={Link}
                  ImageComponent={SmartImage}
                  imageSizes={cardSizes}
                />
              ))}
            </div>
          </section>
        )}

        {(questions.length > 0 || guides.length > 0) && (
          <section className="mt-14 max-w-3xl">
            <p className="section-eyebrow">{t.questionsEyebrow}</p>
            <h2>{t.questionsTitle}</h2>
            <ul className="mt-5 grid gap-3">
              {[...guides, ...questions].slice(0, 8).map((item) => (
                <li key={`${item.type}:${item.id}`} className="surface p-4">
                  <ContentTypeBadge type={item.type} />
                  <Link
                    href={p(item.href)}
                    className="mt-2 block font-semibold hover:text-[var(--accent-strong)]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
