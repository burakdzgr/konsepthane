import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, Pagination } from '@ilham/ui';
import { BlogCard } from '@/components/blog-card';
import { PageHeader } from '@/components/community-layout';
import { BLOG_PAGE_SIZE, getBlogPosts, getBlogTags } from '@/lib/blog';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { pageHref, pageMeta, parsePage } from '@/lib/pagination';

/** Tag hubs are navigation aids, not landing pages: crawlable, never indexed. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, tag } = await params;
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.blog;
  const label = (await getBlogTags()).find((item) => item.slug === tag)?.tag ?? tag;
  return localeMetadata(locale, `/blog/etiket/${tag}`, {
    title: `${t.tagHeading(label)} · ${t.title}`,
    description: t.metaDescription,
    robots: { index: false, follow: true },
  });
}

export default async function BlogTagPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tag: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const [{ locale: localeParam, tag }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.blog;
  const p = (path: string) => localePath(locale, path);
  const page = parsePage(sayfa);
  const [result, tags] = await Promise.all([getBlogPosts({ page, tag }), getBlogTags()]);
  const label = tags.find((item) => item.slug === tag)?.tag;
  if (!label && result.data.length === 0) notFound();
  const meta = pageMeta(result.meta, page, BLOG_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  return (
    <>
      <PageHeader
        eyebrow={t.tagEyebrow}
        title={t.tagHeading(label ?? tag)}
        description={t.description}
      />
      <div className="wrap py-8">
        {result.data.length === 0 ? (
          <EmptyState title={t.empty} description={t.emptyText} />
        ) : (
          <>
            <div className="blog-grid">
              {result.data.map((post) => (
                <BlogCard key={post.id} post={post} locale={locale} />
              ))}
            </div>
            <Pagination
              page={meta.page}
              pageCount={meta.pageCount}
              href={(n) => p(pageHref(`/blog/etiket/${tag}`, n))}
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
