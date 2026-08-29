import type { Metadata } from 'next';
import { AuthRequired } from '@/components/auth-modal';
import Link from 'next/link';
import { Button, EmptyState, Icon, Input } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { Flash, SaveToggle } from '@/components/engagement';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { createCollectionAction, updateCollectionAction } from '@/lib/actions';
import { getMember } from '@/lib/auth';
import { getMyCollections, getSavedItems } from '@/lib/community';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/kaydedilenler', {
    title: getDictionary(locale).pages.saved.title,
    robots: { index: false, follow: false },
  });
}

export default async function SavedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mesaj?: string; hata?: string }>;
}) {
  const [{ locale: localeParam }, , member] = await Promise.all([
    params,
    searchParams,
    getMember(),
  ]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.saved;
  const p = (path: string) => localePath(locale, path);
  const returnTo = p('/kaydedilenler');
  const typeLabel = (type: string) => (t.types as Record<string, string>)[type] ?? t.types.other;
  if (!member) {
    const modal = getDictionary(locale).pages.authModal;
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.headingGuest} description={t.descriptionGuest} />
        <AuthRequired next={returnTo} title={modal.requiredTitle} text={modal.requiredText} />
      </>
    );
  }
  const [saved, collections] = await Promise.all([getSavedItems(), getMyCollections()]);
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.heading} description={t.description} />
      <div className="wrap py-8">
        <Flash />
        <section>
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.boardsEyebrow}</p>
              <h2>{collections.length ? t.boardsCount(collections.length) : t.firstBoard}</h2>
            </div>
          </div>
          <div className="card-grid-4 mt-6">
            {collections.map((collection) => {
              const images = [
                collection.coverImageUrl,
                ...collection.items.map((entry) => entry.content?.imageUrl),
              ].filter(Boolean) as string[];
              return (
                <article key={collection.id} className="saved-card">
                  <Link href={p(`/koleksiyon/${collection.slug}`)} className="board-cover">
                    {(images.length ? images : ['/placeholders/minimal-concept.svg'])
                      .slice(0, 3)
                      .map((src, index) => (
                        <span key={`${src}-${index}`} className="img-frame">
                          <SmartImage src={src} alt="" sizes="(max-width: 640px) 50vw, 200px" />
                        </span>
                      ))}
                  </Link>
                  <div className="saved-card-body">
                    <div className="grid gap-2">
                      <div className="min-w-0">
                        <p className="section-eyebrow">
                          {t.ideas(collection.itemCount)} · {t.visibility[collection.visibility]}
                        </p>
                        <h3 className="mt-1 text-base font-semibold leading-tight">
                          <Link href={p(`/koleksiyon/${collection.slug}`)}>{collection.title}</Link>
                        </h3>
                      </div>
                      <form action={updateCollectionAction} className="board-visibility-form">
                        <input type="hidden" name="collectionId" value={collection.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <select
                          name="visibility"
                          defaultValue={collection.visibility}
                          className="field min-h-9 min-w-0 flex-1 rounded-full px-3 text-xs"
                          aria-label={t.visibilityOf(collection.title)}
                        >
                          {(['PRIVATE', 'UNLISTED', 'PUBLIC'] as const).map((value) => (
                            <option key={value} value={value}>
                              {t.visibility[value]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="community-action">
                          {t.apply}
                        </button>
                      </form>
                    </div>
                    {collection.items.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm">
                        {collection.items.slice(0, 3).map((entry) => (
                          <li key={entry.id} className="min-w-0">
                            <Link
                              href={entry.content?.href ? p(entry.content.href) : '#'}
                              className="block truncate text-[var(--muted)]"
                            >
                              {typeLabel(entry.entityType)} · {entry.content?.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={p(`/pano/${collection.slug}`)}
                      className="community-action mt-2 justify-self-start"
                    >
                      <Icon name="arrow-right" size={14} /> {t.manageBoard}
                    </Link>
                  </div>
                </article>
              );
            })}
            <form
              action={createCollectionAction}
              className="grid gap-3 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 p-5"
            >
              <input type="hidden" name="returnTo" value={returnTo} />
              <p className="font-semibold">{t.newBoard}</p>
              <Input name="title" placeholder={t.boardTitlePlaceholder} required minLength={2} />
              <Input
                name="description"
                placeholder={t.boardDescriptionPlaceholder}
                maxLength={500}
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isPublic" /> {t.makePublic}
              </label>
              <Button type="submit">{t.createBoard}</Button>
            </form>
          </div>
        </section>

        <section className="mt-14">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.savedEyebrow}</p>
              <h2>{saved.length ? t.savedCount(saved.length) : t.noSaved}</h2>
            </div>
            <Link href={p('/fikirler')}>
              {t.exploreIdeas} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          {saved.length ? (
            <div className="saved-grid mt-6">
              {saved.map((entry) => (
                <article key={entry.id} className="saved-card relative">
                  <Link href={p(entry.content.href)} className="img-frame">
                    <SmartImage
                      src={entry.content.imageUrl ?? '/placeholders/minimal-concept.svg'}
                      alt=""
                      sizes={cardSizes}
                    />
                  </Link>
                  <div className="experience-card-action">
                    <SaveToggle
                      compact
                      active
                      contentType={entry.contentType}
                      contentId={entry.contentId}
                      returnTo={returnTo}
                      label={entry.content.title}
                    />
                  </div>
                  <div className="saved-card-body">
                    <p className="section-eyebrow">
                      {typeLabel(entry.contentType)}
                      {entry.content.meta ? ` · ${entry.content.meta}` : ''}
                    </p>
                    <h3 className="text-base font-semibold leading-tight">
                      <Link href={p(entry.content.href)}>{entry.content.title}</Link>
                    </h3>
                    {entry.content.summary && (
                      <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                        {entry.content.summary}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title={t.emptyTitle} description={t.emptyText} />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
