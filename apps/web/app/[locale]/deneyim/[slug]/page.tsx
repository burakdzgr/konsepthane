import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Badge, Breadcrumb, Card, CommentThread, Icon, TextArea, UserMiniProfile } from '@ilham/ui';
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd } from '@ilham/seo';
import { Flash, LikeToggle, ReportForm, SaveToggle, SessionGate } from '@/components/engagement';
import { SmartImage, gallerySizes } from '@/components/smart-image';
import { MemberSessionError, hasMemberSession, loginHref, memberApi } from '@/lib/auth';
import { getExperience } from '@/lib/community';
import { authorHref } from '@/lib/editors';
import { getExperiences } from '@/lib/community';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, getLocale, localeMetadata, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const item = await getExperience(slug);
  if (!item) return {};
  const description = item.summary ?? item.body.slice(0, 160);
  return localeMetadata(locale, `/deneyim/${item.slug}`, {
    title: item.title,
    description,
    indexable: item.indexability === 'INDEX',
    openGraph: {
      title: item.title,
      description,
      type: 'article',
      images: item.images[0] ? [{ url: item.images[0].url, alt: item.images[0].altText }] : [],
    },
  });
}

async function comment(experienceId: string, slug: string, formData: FormData) {
  'use server';
  const path = localePath(await getLocale(), `/deneyim/${slug}`);
  if (!(await hasMemberSession())) redirect(loginHref(`${path}#yorumlar`));
  let failure: string | null = null;
  let sessionLost = false;
  try {
    await memberApi('/comments', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'EVENT_EXPERIENCE',
        contentId: experienceId,
        body: formText(formData, 'body'),
        parentId: formText(formData, 'parentId') || undefined,
      }),
    });
  } catch (error) {
    if (error instanceof MemberSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'Yorum gönderilemedi.';
  }
  if (sessionLost) redirect(loginHref(`${path}#yorumlar`));
  revalidatePath(path);
  if (failure) redirect(`${path}?hata=${encodeURIComponent(failure)}#yorumlar`);
  redirect(`${path}#yorumlar`);
}

export const revalidate = 300;
export const dynamicParams = true;

/** Prebuilds the indexable slugs at deploy time; new ones render on first request. */
export async function generateStaticParams() {
  const items = await getExperiences({ pageSize: 50 });
  return items
    .filter((item) => item.indexability === 'INDEX')
    .map((item) => ({ locale: 'tr', slug: item.slug }));
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const { slug } = await params;
  const item = await getExperience(slug);
  if (!item) notFound();
  const path = p(`/deneyim/${item.slug}`);
  const profile = item.author.profile;
  const images = item.images.length
    ? item.images
    : item.heroImageUrl
      ? [{ id: 'hero', url: item.heroImageUrl, altText: item.title, sortOrder: 0 }]
      : [];
  const commentAction = comment.bind(null, item.id, item.slug);
  const structuredData = [
    breadcrumbJsonLd([
      { name: 'Ana sayfa', url: absoluteUrl(p('/')) },
      { name: 'Deneyimler', url: absoluteUrl(p('/deneyimler')) },
      { name: item.title, url: absoluteUrl(path) },
    ]),
    articleJsonLd({
      url: absoluteUrl(path),
      headline: item.title,
      description: item.summary ?? item.body.slice(0, 220),
      images: images.map((image) => absoluteUrl(image.url)),
      datePublished: item.createdAt,
      dateModified: item.updatedAt,
      // UGC: the member is the author (displayName / username, no real-name requirement).
      author: {
        type: 'Person',
        name: profile?.displayName ?? 'Konsepthane topluluk üyesi',
        url: authorHref(locale, profile) ? absoluteUrl(authorHref(locale, profile)!) : null,
      },
      publisherUrl: absoluteUrl(p('/')),
      section: 'Gerçek kutlama deneyimi',
      language: locale,
    }),
  ];
  return (
    <article className="wrap py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumb
        items={[
          { label: 'Ana sayfa', href: p('/') },
          { label: 'Deneyimler', href: p('/deneyimler') },
          { label: item.title },
        ]}
      />
      <header className="mt-10 max-w-3xl">
        <Badge className="chip-mint">
          <Icon name="camera" size={13} /> Gerçek kutlama
        </Badge>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-6xl">{item.title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">{item.summary}</p>
        <div className="mt-6 flex">
          <UserMiniProfile
            name={profile?.displayName ?? 'Topluluk üyesi'}
            username={profile?.username}
            href={authorHref(locale, profile)}
            avatarUrl={profile?.avatarUrl}
            meta={getDictionary(locale).author.verbs.shared}
          />
        </div>
      </header>
      <div className={`editorial-gallery mt-10 ${images.length > 1 ? 'has-multiple' : ''}`}>
        {images.slice(0, 3).map((image, index) => (
          <div key={image.id} className={`img-frame ${index === 0 ? 'gallery-main' : ''}`}>
            <SmartImage
              src={image.url}
              alt={image.altText}
              sizes={gallerySizes}
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      {images.length > 3 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {images.slice(3).map((image) => (
            <span key={image.id} className="img-frame aspect-square w-full rounded-2xl">
              <SmartImage
                src={image.url}
                alt={image.altText}
                sizes="(max-width: 640px) 33vw, 160px"
              />
            </span>
          ))}
        </div>
      )}
      <div className="mt-8 flex max-w-3xl flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
        {[
          item.eventType?.name,
          item.ageLabel,
          item.themeVariation,
          item.venueType,
          item.city,
          item.guestCount ? `${item.guestCount} misafir` : null,
          item.budgetLabel,
          ...(item.colors ?? []),
        ]
          .filter(Boolean)
          .map((value) => (
            <span key={String(value)} className="rounded-full bg-stone-100 px-3 py-2">
              {value}
            </span>
          ))}
      </div>
      <div className="mt-12 max-w-3xl">
        <p className="whitespace-pre-line text-lg leading-9">{item.body}</p>
        {item.whatWorked && (
          <Card className="mt-10 border-emerald-100 bg-emerald-50/60 p-6 shadow-none">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              En iyi çalışan şey
            </p>
            <p className="mt-3 leading-7">{item.whatWorked}</p>
          </Card>
        )}
        {item.whatWouldChange && (
          <Card className="mt-4 border-amber-100 bg-amber-50/60 p-6 shadow-none">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Bir dahaki sefere
            </p>
            <p className="mt-3 leading-7">{item.whatWouldChange}</p>
          </Card>
        )}
        {item.tips && (
          <section className="mt-10">
            <h2 className="font-serif text-3xl">Deneyimden ipucu</h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{item.tips}</p>
          </section>
        )}
      </div>
      <div className="mt-10 flex max-w-3xl flex-wrap items-center gap-1 border-y border-[var(--line)] py-4 text-sm font-semibold">
        <SessionGate
          fallback={
            <>
              <span className="community-action">
                <Icon name="heart" size={17} /> {item.reactionCount}
              </span>
              <Link href={loginHref(path)} className="community-action">
                <Icon name="bookmark" size={17} /> Kaydet
              </Link>
            </>
          }
        >
          <LikeToggle
            contentType="EVENT_EXPERIENCE"
            contentId={item.id}
            returnTo={path}
            count={item.reactionCount}
          />
          <SaveToggle contentType="EVENT_EXPERIENCE" contentId={item.id} returnTo={path} />
        </SessionGate>
        <a href="#yorumlar" className="community-action">
          <Icon name="comment" size={17} /> {item.commentCount} yorum
        </a>
        <ReportForm contentType="EVENT_EXPERIENCE" contentId={item.id} returnTo={path} />
      </div>
      {item.concept && (
        <section className="mt-12 max-w-3xl">
          <p className="section-eyebrow">Uygulanan konsept</p>
          <Link
            href={p(`/konsept/${item.concept.slug}`)}
            className="surface mt-3 grid grid-cols-[120px_1fr] overflow-hidden"
          >
            <span className="img-frame h-full min-h-[120px] w-full">
              <SmartImage
                src={item.concept.heroImageUrl ?? '/placeholders/teddy-concept.svg'}
                alt=""
                sizes="120px"
              />
            </span>
            <div className="p-5">
              <strong>{item.concept.title}</strong>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Konsepti, diğer deneyimleri ve soruları incele →
              </p>
            </div>
          </Link>
        </section>
      )}
      <section id="yorumlar" className="mt-14 max-w-3xl">
        <h2 className="font-serif text-3xl">Yorumlar</h2>
        <div className="mt-6">
          <Flash />
        </div>
        {item.comments?.length ? (
          <div className="mt-2">
            <CommentThread
              comments={item.comments}
              renderReply={(entry) => (
                <SessionGate>
                  <details className="reply-form mt-2 text-xs font-semibold text-[var(--muted)]">
                    <summary className="cursor-pointer">Yanıtla</summary>
                    <form action={commentAction} className="mt-2 grid gap-2">
                      <input type="hidden" name="parentId" value={entry.id} />
                      <TextArea name="body" required minLength={2} maxLength={3000} rows={3} />
                      <button
                        type="submit"
                        className="community-action is-active justify-self-start"
                      >
                        Yanıtı gönder
                      </button>
                    </form>
                  </details>
                </SessionGate>
              )}
            />
          </div>
        ) : null}
        <SessionGate
          fallback={
            <div className="mt-6 rounded-2xl bg-[#f7f3ec] p-5 text-sm leading-6">
              Yorum yazmak için{' '}
              <Link
                href={loginHref(`${path}#yorumlar`)}
                className="font-semibold text-[var(--accent-strong)]"
              >
                giriş yap
              </Link>
              .
            </div>
          }
        >
          <form action={commentAction} className="mt-6 grid gap-3 rounded-2xl bg-[#f7f3ec] p-5">
            <TextArea
              label="Bu deneyime yorum yap"
              name="body"
              required
              minLength={2}
              maxLength={3000}
              rows={4}
            />
            <button className="justify-self-start rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
              Yorumu gönder
            </button>
          </form>
        </SessionGate>
      </section>
      <nav className="mt-14 grid gap-3 sm:grid-cols-3" aria-label="İlgili içerikler">
        {item.eventType ? (
          <Link href={p(`/kategori/${item.eventType.slug}`)} className="surface p-5 font-semibold">
            Diğer {item.eventType.name.toLocaleLowerCase('tr-TR')} fikirleri →
          </Link>
        ) : (
          <Link href={p('/fikirler')} className="surface p-5 font-semibold">
            Diğer konseptleri keşfet →
          </Link>
        )}
        <Link href={p('/deneyimler')} className="surface p-5 font-semibold">
          Daha fazla gerçek deneyim →
        </Link>
        <Link href={p('/sorular')} className="surface p-5 font-semibold">
          Planlama sorularına bak →
        </Link>
      </nav>
    </article>
  );
}
