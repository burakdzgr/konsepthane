import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, Pagination } from '@ilham/ui';
import { BlogCard } from '@/components/blog-card';
import { BlogFilterChips, BlogTagCloud } from '@/components/blog-filters';
import { PageHeader } from '@/components/community-layout';
import { BLOG_PAGE_SIZE, getBlogCategories, getBlogPosts, getBlogTags } from '@/lib/blog';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.blog;
  return pagedMetadata(
    locale,
    '/blog',
    parsePage(sayfa),
    {
      title: t.title,
      description: t.metaDescription,
      alternates: { types: { 'application/rss+xml': '/blog/rss.xml' } },
    },
    dictionary.pages.pagination.titleSuffix,
  );
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const [{ locale: localeParam }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.blog;
  const p = (path: string) => localePath(locale, path);
  const page = parsePage(sayfa);
  const [result, categories, tags] = await Promise.all([
    getBlogPosts({ page }),
    getBlogCategories(),
    getBlogTags(),
  ]);
  const meta = pageMeta(result.meta, page, BLOG_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  const posts = result.data;
  // Page 1 opens with a hero: the newest featured post, or simply the newest post.
  const hero = page === 1 ? (posts.find((post) => post.featured) ?? posts[0]) : undefined;
  const rest = hero ? posts.filter((post) => post.id !== hero.id) : posts;
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.heading}
        description={t.description}
        action={
          <a
            href="/blog/rss.xml"
            className="btn btn-ghost"
            rel="alternate"
            type="application/rss+xml"
          >
            {t.rss}
          </a>
        }
      />
      <div className="wrap py-8">
        <BlogFilterChips locale={locale} categories={categories} />
        {posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState title={t.empty} description={t.emptyText} />
          </div>
        ) : (
          <>
            {hero && (
              <div className="mt-8">
                <BlogCard post={hero} locale={locale} variant="hero" />
              </div>
            )}
            {rest.length > 0 && (
              <section className="mt-10" aria-label={t.latest}>
                <div className="section-heading">
                  <div>
                    <p className="section-eyebrow">{t.eyebrow}</p>
                    <h2>{t.latest}</h2>
                  </div>
                </div>
                <div className="blog-grid mt-6">
                  {rest.map((post) => (
                    <BlogCard key={post.id} post={post} locale={locale} />
                  ))}
                </div>
              </section>
            )}
            <Pagination
              page={meta.page}
              pageCount={meta.pageCount}
              href={(n) => p(pageHref('/blog', n))}
              labels={dictionary.pages.pagination}
              LinkComponent={Link}
            />
          </>
        )}
        <BlogTagCloud locale={locale} tags={tags} />
      </div>
    </>
  );
}
