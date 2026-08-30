import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Breadcrumb, Card, Icon, Select } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { Flash } from '@/components/engagement';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { removeCollectionItemAction, updateCollectionAction } from '@/lib/actions';
import { hasMemberSession, loginHref } from '@/lib/auth';
import { getMyCollections } from '@/lib/community';
import { asLocale, getDictionary, localePath } from '@/lib/i18n';

/**
 * Owner view of a planning board — works for every visibility (private boards have no public
 * `/koleksiyon/` page). Personal, cookie-based and noindex.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const t = getDictionary(asLocale(localeParam)).pages.saved;
  return { title: t.manageBoard, robots: { index: false, follow: false } };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.saved;
  const p = (path: string) => localePath(locale, path);
  const path = p(`/pano/${slug}`);
  if (!(await hasMemberSession())) {
    return (
      <div className="wrap py-16 text-center">
        <p className="text-lg font-semibold">{t.loginTitle}</p>
        <Link href={loginHref(path)} className="btn btn-primary mt-6">
          {t.login}
        </Link>
      </div>
    );
  }
  const collections = await getMyCollections();
  const board = collections.find((entry) => entry.slug === slug);
  if (!board) notFound();
  const typeLabel = (type: string) => (t.types as Record<string, string>)[type] ?? t.types.other;
  const visibility = (board.visibility ?? 'PRIVATE') as keyof typeof t.visibility;
  return (
    <>
      <PageHeader eyebrow={t.boardsEyebrow} title={board.title} description={t.boardOwnerHint} />
      <div className="wrap py-8">
        <Breadcrumb
          label={dictionary.pages.breadcrumbLabel}
          items={[
            { label: dictionary.nav.home, href: p('/') },
            { label: t.heading, href: p('/kaydedilenler') },
            { label: board.title },
          ]}
        />
        <Flash />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge>
            {t.ideas(board.itemCount)} · {t.visibility[visibility]}
          </Badge>
          <form action={updateCollectionAction} className="board-visibility-form">
            <input type="hidden" name="collectionId" value={board.id} />
            <input type="hidden" name="returnTo" value={path} />
            <Select
              name="visibility"
              defaultValue={visibility}
              className="min-h-9 rounded-full px-3 text-xs"
              style={{ width: 'auto' }}
              aria-label={t.visibilityOf(board.title)}
            >
              {(['PRIVATE', 'UNLISTED', 'PUBLIC'] as const).map((value) => (
                <option key={value} value={value}>
                  {t.visibility[value]}
                </option>
              ))}
            </Select>
            <button type="submit" className="community-action">
              {t.apply}
            </button>
          </form>
          {visibility === 'PUBLIC' && (
            <Link href={p(`/koleksiyon/${board.slug}`)} className="community-action">
              <Icon name="arrow-right" size={14} /> {t.publicPage}
            </Link>
          )}
          <Link href={p('/kaydedilenler')} className="community-action ml-auto">
            {t.backToBoards}
          </Link>
        </div>

        <section className="mt-10">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.boardItems}</p>
              <h2>{t.ideas(board.items.length)}</h2>
            </div>
          </div>
          {board.items.length ? (
            <div className="collection-detail-grid mt-7">
              {board.items.map((entry) => (
                <Card key={entry.id} className="group overflow-hidden shadow-none">
                  <Link href={entry.content?.href ? p(entry.content.href) : '#'} className="block">
                    <div className="img-frame aspect-[4/3] bg-[var(--surface-stone)]">
                      <SmartImage
                        src={entry.content?.imageUrl ?? '/placeholders/minimal-concept.svg'}
                        alt=""
                        sizes={cardSizes}
                        className="transition duration-300 group-hover:scale-[1.025]"
                      />
                    </div>
                  </Link>
                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--accent-strong)]">
                      {typeLabel(entry.entityType)}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold leading-tight">
                      <Link href={entry.content?.href ? p(entry.content.href) : '#'}>
                        {entry.content?.title ?? '—'}
                      </Link>
                    </h3>
                    <form action={removeCollectionItemAction} className="mt-4">
                      <input type="hidden" name="collectionId" value={board.id} />
                      <input type="hidden" name="itemId" value={entry.id} />
                      <input type="hidden" name="returnTo" value={path} />
                      <button type="submit" className="community-action is-remove">
                        <Icon name="x" size={12} /> {t.removeFromBoard}
                      </button>
                    </form>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-[var(--muted)]">{t.emptyBoard}</p>
          )}
        </section>
      </div>
    </>
  );
}
