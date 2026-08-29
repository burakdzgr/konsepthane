import Link from 'next/link';
import { Icon } from '@ilham/ui';
import { formatBlogDate, type BlogPostSummary } from '@/lib/blog';
import { getDictionary, localePath, type Locale } from '@/lib/i18n';
import { displayMediaSrc } from '@/lib/media-url';

/** Placeholder cover for posts without an image: brand gradient + first letter. */
function CoverFallback({ title }: { title: string }) {
  return (
    <div className="blog-cover-fallback" aria-hidden="true">
      <span>{title.trim().charAt(0).toLocaleUpperCase('tr-TR')}</span>
    </div>
  );
}

export function BlogCard({
  post,
  locale,
  variant = 'grid',
}: {
  post: BlogPostSummary;
  locale: Locale;
  variant?: 'grid' | 'hero' | 'row';
}) {
  const t = getDictionary(locale).pages.blog;
  const href = localePath(locale, `/blog/${post.slug}`);
  const author = post.author?.profile;
  return (
    <article className={`blog-card blog-card-${variant}`}>
      <Link href={href} className="blog-card-media" aria-hidden="true" tabIndex={-1}>
        {post.coverImageUrl ? (
          <img
            src={displayMediaSrc(post.coverImageUrl)}
            alt={post.coverImageAlt ?? ''}
            loading={variant === 'hero' ? 'eager' : 'lazy'}
          />
        ) : (
          <CoverFallback title={post.title} />
        )}
      </Link>
      <div className="blog-card-body">
        <div className="blog-card-meta">
          {post.category && (
            <Link
              href={localePath(locale, `/blog/kategori/${post.category.slug}`)}
              className="blog-chip"
            >
              {post.category.name}
            </Link>
          )}
          <span>{formatBlogDate(post.publishedAt ?? post.createdAt, locale)}</span>
          <span>·</span>
          <span>{t.readingTime(post.readingMinutes)}</span>
        </div>
        <h3 className="blog-card-title">
          <Link href={href}>{post.title}</Link>
        </h3>
        <p className="blog-card-excerpt">{post.excerpt}</p>
        {variant !== 'row' && (
          <div className="blog-card-footer">
            <span className="blog-card-author">
              <Icon name="user" size={14} />
              {author?.displayName ?? t.publisher}
            </span>
            <Link href={href} className="blog-card-more">
              {t.readMore} →
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
