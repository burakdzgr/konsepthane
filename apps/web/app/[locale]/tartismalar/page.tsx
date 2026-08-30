import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DiscussionCard, EmptyState, Pagination } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { SmartImage } from '@/components/smart-image';
import { getDiscussionsPage } from '@/lib/community';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';
import { pageHref, pageMeta, pagedMetadata, parsePage } from '@/lib/pagination';

const DISCUSSIONS_PAGE_SIZE = 20;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}): Promise<Metadata> {
  const [{ locale: localeParam }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  return pagedMetadata(
    locale,
    '/tartismalar',
    parsePage(sayfa),
    {
      title: 'Tartışmalar',
      description:
        'Kutlama planlama deneyimlerinin ve farklı görüşlerin konuşulduğu topluluk tartışmaları.',
    },
    getDictionary(locale).pages.pagination.titleSuffix,
  );
}
export default async function DiscussionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const [{ locale: localeParam }, { sayfa }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const page = parsePage(sayfa);
  const result = await getDiscussionsPage({ page, pageSize: DISCUSSIONS_PAGE_SIZE });
  const meta = pageMeta(result.meta, page, DISCUSSIONS_PAGE_SIZE);
  if (page > 1 && page > meta.pageCount) notFound();
  const items = result.data;
  return (
    <>
      <PageHeader
        eyebrow="Topluluk forumu"
        title="Fikirleri konuşalım"
        description="Tek bir doğru cevabı olmayan kararları, deneyimleri ve alternatifleri toplulukla tartış."
        action={
          <Link
            href={p('/olustur?tur=tartisma')}
            className="rounded-full bg-[var(--accent)] px-5 py-3 font-semibold text-white"
          >
            Tartışma başlat
          </Link>
        }
      />
      <div className="wrap reading space-y-4 py-8">
        {items.length ? (
          items.map((item) => (
            <DiscussionCard
              LinkComponent={Link}
              ImageComponent={SmartImage}
              key={item.id}
              title={item.title}
              summary={item.body}
              href={p(`/tartisma/${item.slug}`)}
              authorName={item.author.profile?.displayName}
              username={item.author.profile?.username}
              reactions={item.reactionCount}
              responses={item.commentCount}
              saves={item.saveCount}
              meta={item.locked ? 'Kilitli' : 'Tartışmaya açık'}
            />
          ))
        ) : (
          <EmptyState
            title="Henüz tartışma yok"
            description="İlk tartışmayı sen başlat; topluluk görüşleri burada toplanır."
          />
        )}
        <Pagination
          page={meta.page}
          pageCount={meta.pageCount}
          href={(n) => p(pageHref('/tartismalar', n))}
          labels={dictionary.pages.pagination}
          LinkComponent={Link}
        />
      </div>
    </>
  );
}
