import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, ExperienceCard, Icon, Pagination } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { SaveToggle } from '@/components/engagement';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { getEventTypes, getExperiencesPage } from '@/lib/community';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { DEFAULT_PAGE_SIZE, pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string; etkinlik?: string; mekan?: string; sirala?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam }, { sayfa, etkinlik, mekan, sirala }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.experiences;
  return pagedMetadata(
    locale,
    '/deneyimler',
    parsePage(sayfa),
    { title: t.title, description: t.metaDescription },
    dictionary.pages.pagination.titleSuffix,
    { filtered: Boolean(etkinlik || mekan || (sirala && sirala !== 'popular')) },
  );
}

export default async function ExperiencesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    gonderildi?: string;
    etkinlik?: string;
    mekan?: string;
    sirala?: string;
    sayfa?: string;
  }>;
}) {
  const [{ locale: localeParam }, { gonderildi, etkinlik, mekan, sirala, sayfa }] =
    await Promise.all([params, searchParams]);
  const page = parsePage(sayfa);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.experiences;
  const p = (path: string) => localePath(locale, path);
  const sort = sirala === 'new' ? 'new' : 'popular';
  const [result, eventTypes] = await Promise.all([
    getExperiencesPage({
      eventType: etkinlik,
      venue: mekan,
      sort,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    }),
    getEventTypes(),
  ]);
  const meta = pageMeta(result.meta, page, DEFAULT_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  const items = result.data;
  // Filter changes reset to page 1; only explicit pagination carries `sayfa`.
  const buildHref = (next: { etkinlik?: string; mekan?: string; sirala?: string }, n = 1) => {
    const query = new URLSearchParams();
    const merged = { etkinlik, mekan, sirala: sort, ...next };
    if (merged.etkinlik) query.set('etkinlik', merged.etkinlik);
    if (merged.mekan) query.set('mekan', merged.mekan);
    if (merged.sirala && merged.sirala !== 'popular') query.set('sirala', merged.sirala);
    return p(pageHref('/deneyimler', n, query));
  };
  const returnTo = buildHref({}, page);
  const isFiltered = Boolean(etkinlik || mekan);

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.heading}
        description={t.description}
        action={
          <Link href={p('/olustur?tur=deneyim')} className="btn btn-primary">
            <Icon name="camera" size={16} /> {t.share}
          </Link>
        }
      />
      <div className="wrap py-10">
        {gonderildi && (
          <div
            role="status"
            className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"
          >
            <strong>{t.submittedTitle}</strong> {t.submittedText}
          </div>
        )}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="filter-chips" aria-label={t.eventType}>
            <Link
              href={buildHref({ etkinlik: '' })}
              className={!etkinlik ? 'is-active' : undefined}
            >
              {dictionary.sort.all}
            </Link>
            {eventTypes.map((type) => (
              <Link
                key={type.id}
                href={buildHref({ etkinlik: type.slug })}
                className={etkinlik === type.slug ? 'is-active' : undefined}
              >
                {type.name}
              </Link>
            ))}
          </div>
          <div className="filter-chips" aria-label={t.venue}>
            {t.venues.map(([value, label]) => (
              <Link
                key={value}
                href={buildHref({ mekan: mekan === value ? '' : value })}
                className={mekan === value ? 'is-active' : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="discovery-tabs mt-5" aria-label={t.sortLabel}>
          <Link
            href={buildHref({ sirala: 'popular' })}
            className={sort === 'popular' ? 'is-active' : undefined}
          >
            {t.featured}
          </Link>
          <Link
            href={buildHref({ sirala: 'new' })}
            className={sort === 'new' ? 'is-active' : undefined}
          >
            {t.new}
          </Link>
        </div>
        {items.length ? (
          <div className="experience-masonry mt-8">
            {items.map((item) => (
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
                authorName={item.author.profile?.displayName ?? dictionary.cards.communityMember}
                authorAvatarUrl={item.author.profile?.avatarUrl}
                meta={[item.ageLabel, item.themeVariation ?? item.eventType?.name, item.venueType]
                  .filter(Boolean)
                  .join(' · ')}
                reactions={item.reactionCount}
                comments={item.commentCount}
                badge={dictionary.cards.realParty}
                action={
                  <SaveToggle
                    compact
                    contentType="EVENT_EXPERIENCE"
                    contentId={item.id}
                    returnTo={returnTo}
                    label={item.title}
                  />
                }
              />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState title={isFiltered ? t.emptyFiltered : t.empty} description={t.emptyText} />
          </div>
        )}
        <Pagination
          page={meta.page}
          pageCount={meta.pageCount}
          href={(n) => buildHref({}, n)}
          labels={dictionary.pages.pagination}
          LinkComponent={Link}
        />
      </div>
    </>
  );
}
