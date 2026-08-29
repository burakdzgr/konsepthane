import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, Pagination } from '@ilham/ui';
import { BlogCard } from '@/components/blog-card';
import { BlogFilterChips } from '@/components/blog-filters';
import { PageHeader } from '@/components/community-layout';
import { BLOG_PAGE_SIZE, getBlogCategories, getBlogPosts } from '@/lib/blog';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

export const revalidate = 300;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam, slug }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.blog;
  const category = (await getBlogCategories()).find((item) => item.slug === slug);
  if (!category) return {};
  return pagedMetadata(
    locale,
    `/blog/kategori/${slug}`,
    parsePage(sayfa),
    {
      title: `${t.categoryHeading(category.name)} · ${t.title}`,
      description: category.description?.trim() || t.metaDescription,
      // A category with nothing published is a thin page: crawlable, not indexed.
      indexable: category.postCount > 0,
    },
    dictionary.pages.pagination.titleSuffix,
  );
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const [{ locale: localeParam, slug }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.blog;
  const p = (path: string) => localePath(locale, path);
  const page = parsePage(sayfa);
  const categories = await getBlogCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const result = await getBlogPosts({ page, category: slug });
  const meta = pageMeta(result.meta, page, BLOG_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  return (
    <>
      <PageHeader
        eyebrow={t.categoryEyebrow}
        title={t.categoryHeading(category.name)}
        description={category.description?.trim() || t.description}
      />
      <div className="wrap py-8">
        <BlogFilterChips locale={locale} categories={categories} active={slug} />
        {result.data.length === 0 ? (
          <div className="mt-8">
            <EmptyState title={t.empty} description={t.emptyText} />
          </div>
        ) : (
          <>
            <div className="blog-grid mt-8">
              {result.data.map((post) => (
                <BlogCard key={post.id} post={post} locale={locale} />
              ))}
            </div>
            <Pagination
              page={meta.page}
              pageCount={meta.pageCount}
              href={(n) => p(pageHref(`/blog/kategori/${slug}`, n))}
              labels={dictionary.pages.pagination}
              LinkComponent={Link}
            />
          </>
        )}
        <p className="mt-10">
          <Link href={p('/blog')} className="btn btn-ghost">
            ← {t.backToBlog}
          </Link>
        </p>
      </div>
    </>
  );
}
