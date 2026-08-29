import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, ExperienceCard, Icon, QuestionCard, TopicChip } from '@ilham/ui';
import { ConceptGrid, DiscoveryControls, parseSort } from '@/components/concept-discovery';
import { PageHeader } from '@/components/community-layout';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { getCategories, getConcepts } from '@/lib/api';
import { getTopics, searchAll } from '@/lib/community';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { topicHref } from '@/lib/topics';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale).pages.explore;
  return localeMetadata(locale, '/kesfet', {
    title: t.title,
    description: t.metaDescription,
    robots: { index: false, follow: true },
  });
}

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; sirala?: string; kategori?: string }>;
}) {
  const [{ locale: localeParam }, { q = '', sirala, kategori }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.explore;
  const p = (path: string) => localePath(locale, path);
  const query = q.trim();
  const sort = parseSort(sirala);
  const [categories, topics] = await Promise.all([getCategories(), getTopics()]);
  const results = query
    ? await searchAll(query)
    : { concepts: [], experiences: [], questions: [], guides: [], topics: [] };
  const concepts = query
    ? results.concepts
    : await getConcepts({ sort, category: kategori, pageSize: 30 });
  const search = new URLSearchParams();
  if (query) search.set('q', query);
  if (kategori) search.set('kategori', kategori);
  if (sort !== 'popular') search.set('sirala', sort);
  const returnTo = p(search.toString() ? `/kesfet?${search.toString()}` : '/kesfet');
  const nothing =
    query &&
    !results.concepts.length &&
    !results.experiences.length &&
    !results.questions.length &&
    !results.guides.length;

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={query ? t.headingFor(query) : t.heading}
        description={t.description}
      />
      <div className="wrap py-8">
        <form className="flex max-w-2xl gap-2" action={p('/kesfet')}>
          <label htmlFor="explore-search" className="sr-only">
            {t.search}
          </label>
          <input
            id="explore-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.searchPlaceholder}
            className="field min-w-0 flex-1 rounded-full"
          />
          <button className="btn btn-primary">{t.search}</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2" aria-label={t.topics}>
          {topics.slice(0, 10).map((topic) => (
            <TopicChip
              key={topic.id}
              label={topic.name}
              href={topicHref(locale, topic.name, topics)}
              count={topic.contentCount}
            />
          ))}
        </div>

        {!query && (
          <DiscoveryControls
            basePath={p('/kesfet')}
            sort={sort}
            category={kategori}
            categories={categories}
          />
        )}

        {nothing ? (
          <div className="mt-8">
            <EmptyState title={t.noResults} description={t.noResultsText} />
            <div className="mt-5 text-center">
              <Link href={p('/fikirler')} className="font-semibold text-[var(--accent-strong)]">
                {t.seeAllConcepts} →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mt-8">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">{t.concepts}</p>
                  <h2>{query ? t.conceptCount(concepts.length) : dictionary.home.discoverTitle}</h2>
                </div>
                <Link href={p('/fikirler')}>
                  {dictionary.home.allConcepts} <Icon name="arrow-right" size={16} />
                </Link>
              </div>
              <ConceptGrid concepts={concepts} returnTo={returnTo} />
            </section>

            {results.experiences.length > 0 && (
              <section className="mt-14">
                <div className="section-heading">
                  <div>
                    <p className="section-eyebrow">{t.realApplications}</p>
                    <h2>{t.experienceCount(results.experiences.length)}</h2>
                  </div>
                  <Link href={p('/deneyimler')}>
                    {dictionary.home.allExperiences} <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
                <div className="card-grid-4 mt-7">
                  {results.experiences.map((item) => (
                    <ExperienceCard
                      LinkComponent={Link}
                      ImageComponent={SmartImage}
                      imageSizes={cardSizes}
                      key={item.id}
                      title={item.title}
                      summary={item.summary ?? item.body}
                      href={p(`/deneyim/${item.slug}`)}
                      imageUrl={
                        item.images[0]?.url ??
                        item.heroImageUrl ??
                        '/placeholders/home-birthday.svg'
                      }
                      imageAlt={item.images[0]?.altText ?? item.title}
                      authorName={
                        item.author.profile?.displayName ?? dictionary.cards.communityMember
                      }
                      authorAvatarUrl={item.author.profile?.avatarUrl}
                      meta={[item.ageLabel, item.themeVariation, item.venueType]
                        .filter(Boolean)
                        .join(' · ')}
                      reactions={item.reactionCount}
                      comments={item.commentCount}
                      badge={dictionary.cards.realParty}
                    />
                  ))}
                </div>
              </section>
            )}

            {(results.questions.length > 0 || results.guides.length > 0) && (
              <section className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
                {results.questions.length > 0 && (
                  <div>
                    <div className="section-heading">
                      <div>
                        <p className="section-eyebrow">{t.community}</p>
                        <h2>{t.questionCount(results.questions.length)}</h2>
                      </div>
                      <Link href={p('/sorular')}>
                        {dictionary.home.allQuestions} <Icon name="arrow-right" size={16} />
                      </Link>
                    </div>
                    <div className="mt-6 space-y-4">
                      {results.questions.map((item) => (
                        <QuestionCard
                          LinkComponent={Link}
                          ImageComponent={SmartImage}
                          key={item.id}
                          title={item.title}
                          summary={item.body}
                          href={p(`/soru/${item.slug}`)}
                          imageUrl={item.images?.[0]?.url}
                          authorName={item.author.profile?.displayName}
                          username={item.author.profile?.username}
                          reactions={item.reactionCount}
                          responses={item.answerCount}
                          meta={item.concept ? t.related(item.concept.title) : t.communityQuestion}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {results.guides.length > 0 && (
                  <div>
                    <div className="section-heading">
                      <div>
                        <p className="section-eyebrow">{t.guides}</p>
                        <h2>{t.guideCount(results.guides.length)}</h2>
                      </div>
                    </div>
                    <div className="mt-6 space-y-3">
                      {results.guides.map((guide) => (
                        <Link
                          key={guide.id}
                          href={p(`/rehber/${guide.slug}`)}
                          className="surface block p-5"
                        >
                          <strong className="block">{guide.title}</strong>
                          <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">
                            {guide.summary}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
