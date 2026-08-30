import type { Metadata } from 'next';
import Link from 'next/link';
import type { CommunityTopic } from '@ilham/shared-types';
import { Breadcrumb } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, itemListJsonLd } from '@ilham/seo';
import { PageHeader } from '@/components/community-layout';
import { getTopics } from '@/lib/community';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';
import { topicIndexDecision } from '@/lib/hub-index';

const kindOrder: Array<CommunityTopic['kind']> = [
  'EVENT_TYPE',
  'AGE',
  'THEME',
  'FORMAT',
  'COLOR',
  'BUDGET',
  'GENERAL',
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale).pages.topics;
  return localeMetadata(locale, '/konu', {
    title: t.title,
    description: t.metaDescription,
    openGraph: { title: t.title, description: t.metaDescription },
  });
}

export default async function TopicsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.topics;
  const p = (path: string) => localePath(locale, path);
  const topics = (await getTopics(50)).filter((topic) => topic.contentCount > 0);
  const groups = kindOrder
    .map((kind) => ({
      kind,
      label: t.kinds[kind],
      items: topics
        .filter((topic) => topic.kind === kind)
        .sort((a, b) => b.contentCount - a.contentCount),
    }))
    .filter((group) => group.items.length > 0);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: dictionary.nav.home, url: absoluteUrl(p('/')) },
      { name: t.title, url: absoluteUrl(p('/konu')) },
    ]),
    itemListJsonLd({
      url: absoluteUrl(p('/konu')),
      name: t.title,
      items: topics
        .filter((topic) => topicIndexDecision(topic).indexable)
        .map((topic) => ({ name: topic.name, url: absoluteUrl(p(`/konu/${topic.slug}`)) })),
    }),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PageHeader eyebrow={t.eyebrow} title={t.heading} description={t.description} />
      <div className="wrap py-8">
        <Breadcrumb
          label={dictionary.pages.breadcrumbLabel}
          items={[{ label: dictionary.nav.home, href: p('/') }, { label: t.title }]}
        />
        <div className="mt-8 grid gap-10">
          {groups.map((group) => (
            <section key={group.kind}>
              <h2 className="section-eyebrow">{group.label}</h2>
              <ul className="topic-index-grid mt-3">
                {group.items.map((topic) => (
                  <li key={topic.id}>
                    <Link href={p(`/konu/${topic.slug}`)} className="topic-index-card">
                      <strong>{topic.name}</strong>
                      {topic.description && <p>{topic.description}</p>}
                      <span>{t.count(topic.contentCount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
