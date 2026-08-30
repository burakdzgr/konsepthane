import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb } from '@ilham/ui';
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd } from '@ilham/seo';
import { AuthorBox, EditorialByline } from '@/components/author-byline';
import { BlogCard } from '@/components/blog-card';
import { blogTagSlug, formatBlogDate, getBlogPost, getLatestBlogPosts } from '@/lib/blog';
import { authorHref, isEditorAuthor } from '@/lib/editors';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { renderMarkdown } from '@/lib/markdown';
import { displayMediaSrc } from '@/lib/media-url';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const post = await getBlogPost(slug);
  if (!post) return {};
  const title = post.seoTitle?.trim() || post.title;
  const description = post.seoDescription?.trim() || post.excerpt;
  const image = post.coverImageUrl ? absoluteUrl(displayMediaSrc(post.coverImageUrl)) : undefined;
  return localeMetadata(locale, `/blog/${post.slug}`, {
    title,
    description,
    indexable: post.indexability === 'INDEX',
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      ...(image ? { images: [{ url: image, alt: post.coverImageAlt ?? post.title }] } : {}),
    },
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.blog;
  const p = (path: string) => localePath(locale, path);
  const [post, latest] = await Promise.all([getBlogPost(slug), getLatestBlogPosts(9)]);
  if (!post) notFound();
  const path = p(`/blog/${post.slug}`);
  // Other posts from the blog (newest first), excluding this one and the same-category picks.
  const others = latest
    .filter((item) => item.id !== post.id && !post.related.some((rel) => rel.id === item.id))
    .slice(0, 6);
  const { html, headings } = renderMarkdown(post.body);
  const author = post.author?.profile;
  const cover = post.coverImageUrl ? displayMediaSrc(post.coverImageUrl) : null;
  const structuredData = [
    breadcrumbJsonLd([
      { name: locale === 'tr' ? 'Ana sayfa' : 'Home', url: absoluteUrl(p('/')) },
      { name: t.breadcrumb, url: absoluteUrl(p('/blog')) },
      ...(post.category
        ? [
            {
              name: post.category.name,
              url: absoluteUrl(p(`/blog/kategori/${post.category.slug}`)),
            },
          ]
        : []),
      { name: post.title, url: absoluteUrl(path) },
    ]),
    {
      ...articleJsonLd({
        url: absoluteUrl(path),
        headline: post.title,
        description: post.seoDescription?.trim() || post.excerpt,
        images: cover ? [absoluteUrl(cover)] : undefined,
        datePublished: post.publishedAt ?? post.createdAt,
        dateModified: post.updatedAt,
        author: isEditorAuthor(author)
          ? {
              type: 'Person',
              name: author.displayName,
              url: absoluteUrl(authorHref(locale, author) ?? '/'),
              id: `${absoluteUrl(authorHref(locale, author) ?? '/')}#person`,
            }
          : { type: 'Organization' },
        publisherUrl: absoluteUrl(p('/')),
        section: post.category?.name ?? t.title,
        language: locale,
      }),
      '@type': 'BlogPosting',
      ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
    },
  ];
  return (
    <article className="wrap blog-article py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumb
        items={[
          { label: locale === 'tr' ? 'Ana sayfa' : 'Home', href: p('/') },
          { label: t.breadcrumb, href: p('/blog') },
          ...(post.category
            ? [{ label: post.category.name, href: p(`/blog/kategori/${post.category.slug}`) }]
            : []),
          { label: post.title },
        ]}
      />
      <header className="blog-article-header">
        {post.category && (
          <Link href={p(`/blog/kategori/${post.category.slug}`)} className="blog-chip is-active">
            {post.category.name}
          </Link>
        )}
        <h1>{post.title}</h1>
        <p className="editorial-lead">{post.excerpt}</p>
        <EditorialByline
          locale={locale}
          author={author}
          readingMinutes={post.readingMinutes}
          publishedAt={post.publishedAt ?? post.createdAt}
          updatedAt={post.updatedAt}
        />
      </header>
      {cover && (
        <figure className="blog-article-cover">
          <img src={cover} alt={post.coverImageAlt ?? ''} loading="eager" />
          {post.coverImageAlt && <figcaption>{post.coverImageAlt}</figcaption>}
        </figure>
      )}
      <div className="blog-article-layout">
        {headings.length >= 3 && (
          <nav className="blog-toc" aria-label={t.toc}>
            <p className="section-eyebrow">{t.toc}</p>
            <ol>
              {headings
                .filter((heading) => heading.level <= 3)
                .map((heading) => (
                  <li key={heading.id} className={`level-${heading.level}`}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
            </ol>
          </nav>
        )}
        <div className="min-w-0">
          <div className="blog-prose" dangerouslySetInnerHTML={{ __html: html }} />
          {post.tags.length > 0 && (
            <div className="blog-article-tags">
              {post.tags.map((tag) => (
                <Link key={tag} href={p(`/blog/etiket/${blogTagSlug(tag)}`)} className="blog-chip">
                  #{tag}
                </Link>
              ))}
            </div>
          )}
          <p className="blog-article-dates">
            {t.publishedOn}: {formatBlogDate(post.publishedAt ?? post.createdAt, locale)}
            {post.updatedAt.slice(0, 10) !== (post.publishedAt ?? post.createdAt).slice(0, 10) && (
              <>
                {' '}
                · {t.updatedOn}: {formatBlogDate(post.updatedAt, locale)}
              </>
            )}
          </p>
          <AuthorBox locale={locale} author={author} />
        </div>
      </div>
      {post.related.length > 0 && (
        <section className="mt-12" aria-label={t.related}>
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.related}</p>
              <h2>{t.relatedText}</h2>
            </div>
            <Link href={p('/blog')} className="btn btn-ghost">
              {t.backToBlog}
            </Link>
          </div>
          <div className="blog-grid mt-6">
            {post.related.map((item) => (
              <BlogCard key={item.id} post={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section className="mt-12 blog-others" aria-label={t.others}>
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.othersEyebrow}</p>
              <h2>{t.others}</h2>
            </div>
            <Link href={p('/blog')} className="btn btn-ghost">
              {t.backToBlog}
            </Link>
          </div>
          <div className="blog-grid mt-6">
            {others.map((item) => (
              <BlogCard key={item.id} post={item} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
