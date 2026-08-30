import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Badge,
  Breadcrumb,
  Card,
  CommentComposer,
  CommentThread,
  CommunityActionBar,
  UserMiniProfile,
} from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, discussionForumJsonLd } from '@ilham/seo';
import { DetailShell } from '@/components/community-layout';
import { getDiscussion } from '@/lib/community';
import { authorHref } from '@/lib/editors';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const item = await getDiscussion(slug);
  return item
    ? localeMetadata(locale, `/tartisma/${item.slug}`, {
        title: item.title,
        description: item.body.slice(0, 155),
        indexable: item.indexability === 'INDEX',
      })
    : {};
}
export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const item = await getDiscussion(slug);
  if (!item) notFound();
  const profile = item.author.profile;
  const path = p(`/tartisma/${item.slug}`);
  const forumJsonLd = discussionForumJsonLd({
    url: absoluteUrl(path),
    headline: item.title,
    text: item.body,
    authorName: profile?.displayName ?? 'Konsepthane topluluk üyesi',
    authorUrl: profile?.username ? absoluteUrl(p(`/uye/${profile.username}`)) : null,
    datePublished: item.publishedAt ?? item.createdAt,
    dateModified: item.updatedAt,
    likeCount: item.reactionCount,
    commentCount: item.commentCount,
    comments: item.comments?.map((entry) => ({
      text: entry.body,
      authorName: entry.author.profile?.displayName ?? 'Konsepthane topluluk üyesi',
      authorUrl: entry.author.profile?.username
        ? absoluteUrl(p(`/uye/${entry.author.profile.username}`))
        : null,
      datePublished: entry.createdAt,
      likeCount: entry.reactionCount,
      url: `${absoluteUrl(path)}#yorum-${entry.id}`,
      comments: entry.replies.map((reply) => ({
        text: reply.body,
        authorName: reply.author.profile?.displayName ?? 'Konsepthane topluluk üyesi',
        authorUrl: reply.author.profile?.username
          ? absoluteUrl(p(`/uye/${reply.author.profile.username}`))
          : null,
        datePublished: reply.createdAt,
        likeCount: reply.reactionCount,
      })),
    })),
  });
  const structuredData = [
    breadcrumbJsonLd([
      { name: 'Ana sayfa', url: absoluteUrl(p('/')) },
      { name: 'Tartışmalar', url: absoluteUrl(p('/tartismalar')) },
      { name: item.title, url: absoluteUrl(path) },
    ]),
    ...(forumJsonLd ? [forumJsonLd] : []),
  ];
  return (
    <DetailShell locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumb
        items={[
          { label: 'Ana sayfa', href: p('/') },
          { label: 'Tartışmalar', href: p('/tartismalar') },
          { label: item.title },
        ]}
      />
      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <UserMiniProfile
            name={profile?.displayName ?? 'Topluluk üyesi'}
            username={profile?.username}
            href={authorHref(locale, profile)}
            meta={getDictionary(locale).author.verbs.started}
          />
          <Badge className="bg-violet-50 text-violet-800">Tartışma</Badge>
        </div>
        <h1 className="mt-6 font-serif text-3xl leading-tight sm:text-4xl">{item.title}</h1>
        <p className="mt-5 whitespace-pre-line text-[16px] leading-8">{item.body}</p>
        <CommunityActionBar
          reactions={item.reactionCount}
          responses={item.commentCount}
          saves={item.saveCount}
        />
      </Card>
      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-semibold">Yorumlar</h2>
        {item.comments?.length ? (
          <div>
            {item.comments.map((entry) => (
              <div key={entry.id} id={`yorum-${entry.id}`}>
                <CommentThread comments={[entry]} />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-sm text-[var(--muted)]">
            İlk yorumu sen yazabilirsin.
          </p>
        )}
        <div className="mt-5">
          <CommentComposer />
        </div>
      </section>
      <nav className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="İlgili içerikler">
        <Link href={p('/fikirler')} className="surface p-5 font-semibold">
          Konsept fikirleri →
        </Link>
        <Link href={p('/deneyimler')} className="surface p-5 font-semibold">
          Gerçek deneyimler →
        </Link>
        <Link href={p('/sorular')} className="surface p-5 font-semibold">
          Yanıtlanan sorular →
        </Link>
      </nav>
    </DetailShell>
  );
}
