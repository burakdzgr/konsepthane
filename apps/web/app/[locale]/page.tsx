import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogCard } from '@/components/blog-card';
import { getLatestBlogPosts } from '@/lib/blog';
import { CollectionCard, EmptyState, ExperienceCard, Icon } from '@ilham/ui';
import { absoluteUrl, organizationJsonLd, websiteJsonLd } from '@ilham/seo';
import { ConceptGrid } from '@/components/concept-discovery';
import { DiscoveryTabs } from '@/components/home-discovery';
import { ScrollRow } from '@/components/scroll-row';
import { SmartImage, cardSizes, heroSizes } from '@/components/smart-image';
import { getCategories, getConcepts } from '@/lib/api';
import {
  getExperiences,
  getFeed,
  getPublicCollections,
  getQuestions,
  getTopics,
} from '@/lib/community';
import { topicHref } from '@/lib/topics';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { siteIdentity } from '@/lib/site';

const categoryVisuals = [
  ['firstBirthday', '1 yaş', '/placeholders/teddy-concept.svg'],
  ['girl', 'kız çocuk', '/placeholders/butterfly-concept.svg'],
  ['boy', 'erkek çocuk', '/placeholders/space-concept.svg'],
  ['home', 'evde', '/placeholders/minimal-concept.svg'],
  ['safari', 'safari', '/placeholders/safari-concept.svg'],
  ['teddy', 'ayıcık', '/placeholders/teddy-experience-1.svg'],
  ['minimal', 'minimal', '/placeholders/home-birthday.svg'],
  ['cakes', 'pasta', '/placeholders/teddy-experience-3.svg'],
  ['table', 'masa', '/placeholders/teddy-experience-2.svg'],
  ['balloons', 'balon', '/placeholders/sage-shower-concept.svg'],
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  return localeMetadata(locale, '/', {
    title: { absolute: `${t.site.name} — ${t.site.tagline}` },
    description: t.site.description,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const homeUrl = absoluteUrl(p('/'));
  const siteIdentityJsonLd = [
    websiteJsonLd({ url: homeUrl, language: locale, description: t.site.description }),
    organizationJsonLd({
      url: homeUrl,
      logoUrl: absoluteUrl('/brand/konsepthane-logo.png'),
      legalName: siteIdentity.legalName,
      sameAs: siteIdentity.sameAs,
      contactEmail: siteIdentity.contactEmail,
      contactUrl: absoluteUrl(p('/iletisim')),
      foundingYear: siteIdentity.foundingYear,
      addressLocality: siteIdentity.city,
      addressCountry: siteIdentity.country,
    }),
  ];
  const [
    categories,
    concepts,
    newConcepts,
    savedConcepts,
    experiences,
    questions,
    feed,
    collections,
    topics,
  ] = await Promise.all([
    getCategories(),
    getConcepts({ sort: 'popular', pageSize: 12 }),
    getConcepts({ sort: 'new', pageSize: 6 }),
    getConcepts({ sort: 'saved', pageSize: 6 }),
    getExperiences({ pageSize: 8 }),
    getQuestions({ tab: 'popular' }),
    getFeed('new'),
    getPublicCollections(),
    getTopics(),
  ]);
  const scrollLabels = { prev: t.home.scrollPrev, next: t.home.scrollNext };
  const guides = feed.filter((item) => item.type === 'GUIDE').slice(0, 3);
  const blogPosts = await getLatestBlogPosts(3);
  const birthdayCount = categories.find((category) => category.slug === 'dogum-gunu')?.conceptCount;
  const editorsPicks = [
    ...concepts.filter((concept) => concept.featured),
    ...concepts.filter((concept) => !concept.featured),
  ].slice(0, 4);
  const hero = editorsPicks[0];
  const heroStats = hero
    ? [
        hero.experienceCount ? t.cards.tried(hero.experienceCount) : null,
        hero.questionCount ? t.cards.questions(hero.questionCount) : null,
        hero.saveCount ? `${hero.saveCount} ${t.cards.saved.toLocaleLowerCase()}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const mosaic = [
    ...(hero
      ? [
          {
            href: p(`/konsept/${hero.slug}`),
            src: hero.heroImageUrl ?? '/placeholders/teddy-concept.svg',
            alt: hero.heroImageAlt ?? hero.title,
          },
        ]
      : []),
    ...experiences.slice(0, 2).map((item) => ({
      href: p(`/deneyim/${item.slug}`),
      src: item.images[0]?.url ?? item.heroImageUrl ?? '/placeholders/home-birthday.svg',
      alt: item.images[0]?.altText ?? item.title,
    })),
  ].slice(0, 3);

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(siteIdentityJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <section className="editorial-hero">
        <div className="wrap grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_.9fr] lg:py-16">
          <div>
            <p className="section-eyebrow">
              <Icon name="sparkle" size={14} /> {t.home.eyebrow}
            </p>
            <h1 className="hero-title mt-4 max-w-3xl">
              {t.home.titleBefore}
              <em>{t.home.titleAccent}</em>
              {t.home.titleAfter}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              {t.home.subtitle}
            </p>
            <form action={p('/kesfet')} className="hero-search mt-7 max-w-xl" role="search">
              <Icon name="search" size={19} />
              <label htmlFor="home-search" className="sr-only">
                {t.home.searchLabel}
              </label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder={t.home.searchPlaceholder}
              />
              <button className="btn btn-primary">{t.home.searchButton}</button>
            </form>
            <div className="topic-chips mt-4" aria-label={t.home.popularSearches}>
              {t.home.chips.map((topic, index) => (
                <Link
                  key={topic}
                  href={topicHref(locale, t.nav.topics[index]?.[1] ?? topic, topics)}
                >
                  {topic}
                </Link>
              ))}
            </div>
          </div>
          {mosaic.length > 0 && (
            <div className="hero-mosaic">
              {mosaic.map((tile, index) => (
                <Link key={tile.href} href={tile.href} aria-label={tile.alt}>
                  <SmartImage
                    src={tile.src}
                    alt={tile.alt}
                    sizes={heroSizes}
                    priority={index === 0}
                  />
                </Link>
              ))}
              {hero && (
                <span className="hero-note">
                  <small>{t.home.editorsPick}</small>
                  <strong>{hero.title}</strong>
                  <span>{heroStats || hero.category.name}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="wrap py-12">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{t.home.categoriesEyebrow}</p>
            <h2>{t.home.categoriesTitle}</h2>
          </div>
          <Link href={p('/kategori/dogum-gunu')}>
            {t.home.birthdayIdeas(birthdayCount ?? 0)} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        <ScrollRow className="mt-6" labels={scrollLabels} ariaLabel={t.home.categoriesTitle}>
          <div className="visual-category-grid">
            {categoryVisuals.map(([key, query, image]) => (
              <Link
                key={key}
                href={topicHref(locale, query, topics)}
                className="visual-category-card"
              >
                <SmartImage src={image} alt="" sizes="(max-width: 640px) 40vw, 180px" />
                <span>
                  {t.home.categories[key]}
                  <Icon name="arrow-right" size={16} />
                </span>
              </Link>
            ))}
          </div>
        </ScrollRow>
      </section>

      <section className="wrap py-10">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{t.home.featuredEyebrow}</p>
            <h2>{t.home.featuredTitle}</h2>
          </div>
          <Link href={p('/fikirler')}>
            {t.home.allConcepts} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {editorsPicks.length > 0 ? (
          <div className="featured-concepts-grid mt-7">
            <ConceptGrid concepts={editorsPicks} returnTo={p('/')} className="contents" />
          </div>
        ) : (
          <div className="mt-7">
            <EmptyState title={t.pages.ideas.empty} description={t.pages.ideas.emptyText} />
          </div>
        )}
      </section>

      <section className="wrap py-12">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{t.home.discoverEyebrow}</p>
            <h2>{t.home.discoverTitle}</h2>
          </div>
        </div>
        <DiscoveryTabs
          ariaLabel={t.home.sortLabel}
          moreLabel={t.home.moreConcepts}
          tabs={[
            {
              key: 'popular',
              moreHref: p('/fikirler'),
              label: t.sort.popular,
              count: concepts.length,
              panel: <ConceptGrid concepts={concepts.slice(0, 6)} returnTo={p('/')} />,
            },
            {
              key: 'new',
              moreHref: p('/fikirler?sirala=new'),
              label: t.sort.new,
              count: newConcepts.length,
              panel: <ConceptGrid concepts={newConcepts.slice(0, 6)} returnTo={p('/')} />,
            },
            {
              key: 'saved',
              moreHref: p('/fikirler?sirala=saved'),
              label: t.sort.saved,
              count: savedConcepts.length,
              panel: <ConceptGrid concepts={savedConcepts.slice(0, 6)} returnTo={p('/')} />,
            },
          ]}
        />
      </section>

      <section className="experience-band mt-10">
        <div className="wrap py-14">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.home.experiencesEyebrow}</p>
              <h2>{t.home.experiencesTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {t.home.experiencesSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={p('/deneyimler')} className="btn btn-ghost">
                {t.home.allExperiences}
              </Link>
              <Link href={p('/olustur?tur=deneyim')} className="btn btn-primary">
                <Icon name="camera" size={16} /> {t.home.shareExperience}
              </Link>
            </div>
          </div>
          <div className="card-grid-4 mt-8">
            {experiences.slice(0, 8).map((item) => (
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
                authorName={item.author.profile?.displayName ?? t.cards.communityMember}
                authorAvatarUrl={item.author.profile?.avatarUrl}
                meta={[item.ageLabel, item.themeVariation ?? item.eventType?.name, item.venueType]
                  .filter(Boolean)
                  .join(' · ')}
                reactions={item.reactionCount}
                comments={item.commentCount}
                badge={t.cards.realParty}
              />
            ))}
          </div>
        </div>
      </section>

      {collections.length > 0 && (
        <section className="wrap py-14">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.home.boardsEyebrow}</p>
              <h2>{t.home.boardsTitle}</h2>
            </div>
            <Link href={p('/kaydedilenler')}>
              {t.home.createBoard} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="card-grid-4 mt-7">
            {collections.slice(0, 4).map((collection) => (
              <CollectionCard
                LinkComponent={Link}
                ImageComponent={SmartImage}
                key={collection.id}
                title={collection.title}
                description={collection.description}
                href={p(`/koleksiyon/${collection.slug}`)}
                ownerName={collection.owner.profile?.displayName ?? t.cards.communityMember}
                itemCount={collection.itemCount}
                coverImageUrl={collection.coverImageUrl}
                previewImages={collection.items.flatMap((entry) => entry.content?.imageUrl ?? [])}
              />
            ))}
          </div>
        </section>
      )}

      {(questions.length > 0 || guides.length > 0) && (
        <section
          className={`wrap grid gap-10 py-12 ${questions.length > 0 && guides.length > 0 ? 'lg:grid-cols-[1.05fr_.95fr]' : ''}`}
        >
          {questions.length > 0 && (
            <div>
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">{t.home.questionsEyebrow}</p>
                  <h2>{t.home.questionsTitle}</h2>
                </div>
                <Link href={p('/sorular')}>
                  {t.home.allQuestions} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
              <div className="question-teaser-list mt-6">
                {questions.slice(0, 4).map((question) => (
                  <Link
                    key={question.id}
                    href={p(`/soru/${question.slug}`)}
                    className="question-teaser"
                  >
                    {question.images?.[0]?.url ? (
                      <span className="img-frame">
                        <SmartImage src={question.images[0].url} alt="" sizes="56px" />
                      </span>
                    ) : (
                      <span aria-hidden="true">
                        <Icon name="help" size={22} />
                      </span>
                    )}
                    <span>
                      <strong>{question.title}</strong>
                      <small>
                        {t.home.answers(question.answerCount)} ·{' '}
                        {question.concept?.title ?? t.home.communityQuestion}
                      </small>
                    </span>
                    <Icon name="arrow-right" size={16} />
                  </Link>
                ))}
              </div>
              <Link href={p('/olustur?tur=soru')} className="btn btn-soft mt-5">
                <Icon name="help" size={16} /> {t.home.askQuestion}
              </Link>
            </div>
          )}
          {guides.length > 0 && (
            <div>
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">{t.home.guidesEyebrow}</p>
                  <h2>{t.home.guidesTitle}</h2>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {guides.map((guide, index) => (
                  <Link key={guide.id} href={p(guide.href)} className="guide-row">
                    <div className={`guide-thumb guide-thumb-${index + 1}`}>0{index + 1}</div>
                    <div>
                      <p className="section-eyebrow">{t.home.guide}</p>
                      <h3 className="mt-1 text-lg leading-snug">{guide.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {guide.summary}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="wrap py-6">
        <div className="cta-band">
          <div>
            <p className="section-eyebrow" style={{ color: '#f7b7bd' }}>
              {t.home.ctaEyebrow}
            </p>
            <h2 className="mt-3">{t.home.ctaTitle}</h2>
            <p className="mt-3 max-w-xl leading-7">{t.home.ctaText}</p>
          </div>
          <div className="cta-actions">
            <Link href={p('/olustur?tur=deneyim')} className="btn btn-primary">
              <Icon name="camera" size={16} /> {t.home.shareExperience}
            </Link>
            <Link href={p('/deneyimler')} className="btn btn-ghost">
              {t.home.ctaExamples}
            </Link>
          </div>
        </div>
      </section>

      <section className="wrap py-12" aria-label={t.home.blogTitle}>
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{t.home.blogEyebrow}</p>
            <h2>{t.home.blogTitle}</h2>
          </div>
          <Link href={p('/blog')}>
            {t.home.blogAll} <Icon name="arrow-right" size={16} />
          </Link>
        </div>
        {blogPosts.length > 0 ? (
          <div className="blog-grid mt-6">
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState title={t.home.blogEmpty} description={t.home.blogEmptyText} />
          </div>
        )}
      </section>
    </div>
  );
}
