import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Breadcrumb, Card, CommunityActionBar } from '@ilham/ui';
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd } from '@ilham/seo';
import { AuthorBox, EditorialByline } from '@/components/author-byline';
import { DetailShell } from '@/components/community-layout';
import { EditorialSources, officialEditorialSourceUrls } from '@/components/editorial-sources';
import { getGuide } from '@/lib/community';
import { EditorialBody } from '@/components/editorial-body';
import { renderMarkdown } from '@ilham/content';
import { authorHref, isEditorAuthor, readingMinutes } from '@/lib/editors';
import { asLocale, localeMetadata, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const item = await getGuide(slug);
  const image = item ? renderMarkdown(item.body).images[0] : undefined;
  return item
    ? localeMetadata(locale, `/rehber/${item.slug}`, {
        title: item.title,
        description: item.summary,
        openGraph: {
          title: item.title,
          description: item.summary,
          type: 'article',
          ...(image ? { images: [{ url: absoluteUrl(image.url), alt: image.alt }] } : {}),
        },
      })
    : {};
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const item = await getGuide(slug);
  if (!item) notFound();
  const path = p(`/rehber/${item.slug}`);
  const structuredData = [
    breadcrumbJsonLd([
      { name: locale === 'tr' ? 'Ana sayfa' : 'Home', url: absoluteUrl(p('/')) },
      { name: locale === 'tr' ? 'Rehberler' : 'Guides', url: absoluteUrl(p('/fikirler')) },
      { name: item.title, url: absoluteUrl(path) },
    ]),
    articleJsonLd({
      url: absoluteUrl(path),
      headline: item.title,
      description: item.summary,
      datePublished: item.publishedAt ?? item.createdAt,
      dateModified: item.updatedAt,
      author: isEditorAuthor(item.author.profile)
        ? {
            type: 'Person',
            name: item.author.profile.displayName,
            url: absoluteUrl(authorHref(locale, item.author.profile) ?? '/'),
            id: `${absoluteUrl(authorHref(locale, item.author.profile) ?? '/')}#person`,
          }
        : { type: 'Organization' },
      publisherUrl: absoluteUrl(p('/')),
      images: renderMarkdown(item.body).images.map((image) => absoluteUrl(image.url)),
      section: locale === 'tr' ? 'Planlama rehberi' : 'Planning guide',
      language: locale,
      citations: officialEditorialSourceUrls,
    }),
  ];
  return (
    <DetailShell locale={locale}>
      <article>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        <Breadcrumb
          items={[
            { label: locale === 'tr' ? 'Ana sayfa' : 'Home', href: p('/') },
            { label: locale === 'tr' ? 'Fikirler' : 'Ideas', href: p('/fikirler') },
            { label: item.title },
          ]}
        />
        <Card className="mt-6 p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <EditorialByline
              locale={locale}
              author={item.author.profile}
              readingMinutes={readingMinutes(item.summary, item.body)}
              publishedAt={item.publishedAt ?? item.createdAt}
              updatedAt={item.updatedAt}
            />
            <Badge>{locale === 'tr' ? 'Rehber' : 'Guide'}</Badge>
          </div>
          <h1 className="mt-7 font-serif text-4xl leading-tight">{item.title}</h1>
          <p className="editorial-lead mt-4">{item.summary}</p>
          <div className="my-7 h-px bg-[var(--line)]" />
          <EditorialBody source={item.body} />
          <EditorialSources locale={locale} />
          <CommunityActionBar
            reactions={item.reactionCount}
            responses={item.commentCount}
            saves={item.saveCount}
          />
          <AuthorBox locale={locale} author={item.author.profile} />
        </Card>
        <nav
          className="mt-8 grid gap-3 sm:grid-cols-3"
          aria-label={locale === 'tr' ? 'İlgili içerikler' : 'Related content'}
        >
          <Link href={p('/fikirler')} className="surface p-5 font-semibold">
            {locale === 'tr' ? 'İlgili konseptleri keşfet →' : 'Explore related concepts →'}
          </Link>
          <Link href={p('/deneyimler')} className="surface p-5 font-semibold">
            {locale === 'tr' ? 'Gerçek uygulamaları gör →' : 'See real applications →'}
          </Link>
          <Link href={p('/sorular')} className="surface p-5 font-semibold">
            {locale === 'tr' ? 'Topluluğa danış →' : 'Ask the community →'}
          </Link>
        </nav>
      </article>
    </DetailShell>
  );
}
