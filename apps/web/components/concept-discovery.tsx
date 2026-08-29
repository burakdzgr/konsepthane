import Link from 'next/link';
import { ConceptCard, EmptyState } from '@ilham/ui';
import type { CategorySummary, ConceptSort, ConceptSummary } from '@ilham/shared-types';
import { SaveToggle } from '@/components/engagement';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { getDictionary, localeFromPath, localePath } from '@/lib/i18n';

const sortKeys: ConceptSort[] = ['popular', 'new', 'saved'];

function buildHref(
  basePath: string,
  params: { sirala?: string | undefined; kategori?: string | undefined; q?: string | undefined },
) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.kategori) search.set('kategori', params.kategori);
  if (params.sirala && params.sirala !== 'popular') search.set('sirala', params.sirala);
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** `returnTo` carries the locale (`/en/...`), so cards and the empty state follow it. */
export function ConceptGrid({
  concepts,
  returnTo,
  className = 'concept-discovery-grid mt-7',
}: {
  concepts: ConceptSummary[];
  returnTo: string;
  className?: string;
}) {
  const locale = localeFromPath(returnTo);
  const t = getDictionary(locale);
  if (!concepts.length)
    return (
      <div className="mt-7">
        <EmptyState title={t.pages.ideas.empty} description={t.pages.ideas.emptyText} />
      </div>
    );
  return (
    <div className={className}>
      {concepts.map((concept) => (
        <ConceptCard
          LinkComponent={Link}
          ImageComponent={SmartImage}
          imageSizes={cardSizes}
          key={concept.id}
          title={concept.title}
          summary={concept.summary}
          href={localePath(locale, `/konsept/${concept.slug}`)}
          imageUrl={concept.heroImageUrl}
          imageAlt={concept.heroImageAlt}
          meta={concept.category.name}
          experienceCount={concept.experienceCount}
          questionCount={concept.questionCount}
          saveCount={concept.saveCount}
          labels={{ tried: t.cards.tried, questions: t.cards.questions, save: t.cards.save }}
          action={
            <SaveToggle
              compact
              contentType="INSPIRATION"
              contentId={concept.id}
              returnTo={returnTo}
              label={concept.title}
            />
          }
        />
      ))}
    </div>
  );
}

/** `basePath` must already carry the locale prefix (e.g. `/en/fikirler`). */
export function DiscoveryControls({
  basePath,
  sort,
  category,
  categories,
  q,
}: {
  basePath: string;
  sort: ConceptSort;
  category?: string | undefined;
  categories: CategorySummary[];
  q?: string | undefined;
}) {
  const t = getDictionary(localeFromPath(basePath));
  return (
    <div className="mt-6 grid gap-4">
      <div className="discovery-tabs" aria-label={t.home.sortLabel}>
        {sortKeys.map((key) => (
          <Link
            key={key}
            href={buildHref(basePath, { sirala: key, kategori: category, q })}
            className={sort === key ? 'is-active' : undefined}
            aria-current={sort === key ? 'page' : undefined}
          >
            {t.sort[key]}
          </Link>
        ))}
      </div>
      <div className="filter-chips" aria-label={t.pages.ideas.eventTypeFilter}>
        <Link
          href={buildHref(basePath, { sirala: sort, q })}
          className={!category ? 'is-active' : undefined}
        >
          {t.sort.all}
        </Link>
        {categories
          .filter((item) => item.status === 'PUBLISHED')
          .map((item) => (
            <Link
              key={item.id}
              // Category chips lead to the category hub (indexable, richer than a filtered list),
              // so every published category is reachable through a crawlable link.
              href={localePath(localeFromPath(basePath), `/kategori/${item.slug}`)}
              className={category === item.slug ? 'is-active' : undefined}
            >
              {item.name}
              {item.conceptCount ? ` · ${item.conceptCount}` : ''}
            </Link>
          ))}
      </div>
    </div>
  );
}

export function parseSort(value: string | undefined): ConceptSort {
  return value === 'new' || value === 'saved' ? value : 'popular';
}
