import Link from 'next/link';
import type { BlogCategory, BlogTag } from '@/lib/blog';
import { getDictionary, localePath, type Locale } from '@/lib/i18n';

/** Category chips: "Tümü" + every published category (empty ones stay visible but muted). */
export function BlogFilterChips({
  locale,
  categories,
  active,
}: {
  locale: Locale;
  categories: BlogCategory[];
  active?: string;
}) {
  const t = getDictionary(locale).pages.blog;
  if (!categories.length) return null;
  return (
    <nav className="blog-filter" aria-label={t.categories}>
      <Link
        href={localePath(locale, '/blog')}
        className={active ? 'blog-chip' : 'blog-chip is-active'}
      >
        {t.all}
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={localePath(locale, `/blog/kategori/${category.slug}`)}
          className={`blog-chip${category.slug === active ? ' is-active' : ''}${category.postCount === 0 ? ' is-empty' : ''}`}
        >
          {category.name}
          {category.postCount > 0 && <small>{category.postCount}</small>}
        </Link>
      ))}
    </nav>
  );
}

export function BlogTagCloud({ locale, tags }: { locale: Locale; tags: BlogTag[] }) {
  const t = getDictionary(locale).pages.blog;
  if (!tags.length) return null;
  return (
    <section className="blog-tags mt-12" aria-label={t.tags}>
      <p className="section-eyebrow">{t.tags}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.slice(0, 30).map((tag) => (
          <Link
            key={tag.slug}
            href={localePath(locale, `/blog/etiket/${tag.slug}`)}
            className="blog-chip"
          >
            #{tag.tag}
            <small>{tag.count}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
