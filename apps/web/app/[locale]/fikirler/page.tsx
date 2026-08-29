import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pagination } from '@ilham/ui';
import { ConceptGrid, DiscoveryControls, parseSort } from '@/components/concept-discovery';
import { PageHeader } from '@/components/community-layout';
import { getCategories, getConceptsPage } from '@/lib/api';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { DEFAULT_PAGE_SIZE, pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string; kategori?: string; sirala?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam }, { sayfa, kategori, sirala }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.ideas;
  return pagedMetadata(
    locale,
    '/fikirler',
    parsePage(sayfa),
    { title: t.title, description: t.metaDescription },
    dictionary.pages.pagination.titleSuffix,
    { filtered: Boolean(kategori || (sirala && sirala !== 'popular')) },
  );
}

export default async function IdeasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sirala?: string; kategori?: string; sayfa?: string }>;
}) {
  const [{ locale: localeParam }, { sirala, kategori, sayfa }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.ideas;
  const p = (path: string) => localePath(locale, path);
  const sort = parseSort(sirala);
  const page = parsePage(sayfa);
  const [result, categories] = await Promise.all([
    getConceptsPage({ sort, category: kategori, pageSize: DEFAULT_PAGE_SIZE, page }),
    getCategories(),
  ]);
  const meta = pageMeta(result.meta, page, DEFAULT_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  const concepts = result.data;
  const activeCategory = categories.find((item) => item.slug === kategori);
  const query = new URLSearchParams({
    ...(kategori ? { kategori } : {}),
    ...(sort !== 'popular' ? { sirala: sort } : {}),
  });
  const returnTo = p(pageHref('/fikirler', page, query));
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={activeCategory ? t.headingFor(activeCategory.name) : t.heading}
        description={t.description}
      />
      <div className="wrap py-8">
        <DiscoveryControls
          basePath={p('/fikirler')}
          sort={sort}
          category={kategori}
          categories={categories}
        />
        <ConceptGrid concepts={concepts} returnTo={returnTo} />
        <Pagination
          page={meta.page}
          pageCount={meta.pageCount}
          href={(n) => p(pageHref('/fikirler', n, query))}
          labels={dictionary.pages.pagination}
          LinkComponent={Link}
        />
      </div>
    </>
  );
}
