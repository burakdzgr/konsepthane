import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumb, Card, ContentTypeBadge, EmptyState, FollowButton, Icon } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from '@ilham/seo';
import { PageHeader } from '@/components/community-layout';
import { landingPagesForTopic } from '@/content/landing-pages';
import { getTopic } from '@/lib/community';
import { getTopics } from '@/lib/community';
import { topicIndexDecision } from '@/lib/hub-index';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

/** Rendered statically and refreshed in the background; personal state comes from client islands. */
export const revalidate = 300;
export const dynamicParams = true;

/** Prebuilds the indexable slugs at deploy time; new ones render on first request. */
export async function generateStaticParams() {
  const topics = await getTopics(50);
  return topics
    .filter((topic) => topic.contentCount >= 3)
    .map((topic) => ({ locale: 'tr', slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.topic;
  const item = await getTopic(slug);
  if (!item) return {};
  const description = item.description ?? t.metaDescription(item.name, item.contentCount);
  return localeMetadata(locale, `/konu/${item.slug}`, {
    title: t.title(item.name),
    description,
    // Deterministic hub policy (`@ilham/seo` shouldIndexHub): items per type, editorial
    // description, images, link support — not a bare item count.
    indexable: topicIndexDecision(item).indexable,
    openGraph: { title: t.title(item.name), description },
  });
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.topic;
  const p = (path: string) => localePath(locale, path);
  const item = await getTopic(slug);
  if (!item) notFound();
  const path = p(`/konu/${item.slug}`);
  const items = item.items ?? [];
  const jsonLd = [
    breadcrumbJsonLd([
      { name: dictionary.nav.home, url: absoluteUrl(p('/')) },
      { name: dictionary.pages.topics.title, url: absoluteUrl(p('/konu')) },
      { name: item.name, url: absoluteUrl(path) },
    ]),
    ...(items.length
      ? [
          itemListJsonLd({
            url: absoluteUrl(path),
            name: t.title(item.name),
            items: items.map((entry) => ({ name: entry.title, url: absoluteUrl(p(entry.href)) })),
          }),
        ]
      : []),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PageHeader
        eyebrow={t.eyebrow}
        title={`#${item.name}`}
        description={item.description ?? t.description(item.name)}
        action={<FollowButton />}
      />
      <div className="wrap py-8">
        <Breadcrumb
          label={dictionary.pages.breadcrumbLabel}
          items={[
            { label: dictionary.nav.home, href: p('/') },
            { label: dictionary.pages.topics.title, href: p('/konu') },
            { label: item.name },
          ]}
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            {items.length ? (
              items.map((entry) => (
                <Card key={`${entry.type}:${entry.id}`} className="p-5 shadow-none">
                  <article className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <ContentTypeBadge type={entry.type} />
                      <h2 className="mt-3 font-display text-xl font-semibold leading-tight">
                        <Link href={p(entry.href)} className="hover:text-[var(--accent-strong)]">
                          {entry.title}
                        </Link>
                      </h2>
                      {entry.summary && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                          {entry.summary}
                        </p>
                      )}
                    </div>
                  </article>
                </Card>
              ))
            ) : (
              <EmptyState title={t.empty} description={t.emptyText} />
            )}
          </div>
          <aside className="space-y-4">
            <Card className="p-5 shadow-none">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <strong className="block text-3xl">{item.contentCount}</strong>
                  <span className="text-sm text-[var(--muted)]">{t.contentCount}</span>
                </div>
                <div>
                  <strong className="block text-3xl">{item.followerCount}</strong>
                  <span className="text-sm text-[var(--muted)]">{t.followerCount}</span>
                </div>
              </div>
            </Card>
            {landingPagesForTopic(item.slug)
              .filter((entry) => entry.locales[locale])
              .map((entry) => (
                <Link
                  key={entry.category}
                  href={p(`/kategori/${entry.category}/${entry.topic}`)}
                  className="btn btn-soft"
                >
                  {entry.locales[locale]!.title}
                </Link>
              ))}
            {/* Search results are robots-blocked; reach them via a form, not a crawlable link. */}
            <form action={p('/kesfet')} method="get" className="contents">
              <input type="hidden" name="q" value={item.name} />
              <button type="submit" className="btn btn-ghost">
                <Icon name="search" size={16} /> {t.searchAll(item.name)}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </>
  );
}
