import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AnswerCard, Badge, Breadcrumb, Card, Icon, TextArea, UserMiniProfile } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, qaPageJsonLd } from '@ilham/seo';
import { DetailShell } from '@/components/community-layout';
import { SmartImage } from '@/components/smart-image';
import {
  Flash,
  LikeToggle,
  OwnerGate,
  QuestionFollowToggle,
  ReportForm,
  SaveToggle,
  SessionGate,
} from '@/components/engagement';
import { acceptAnswerAction } from '@/lib/actions';
import { MemberSessionError, hasMemberSession, loginHref, memberApi } from '@/lib/auth';
import { getQuestion, getQuestions } from '@/lib/community';
import { formText } from '@/lib/form';
import { authorHref } from '@/lib/editors';
import { asLocale, getDictionary, getLocale, localeMetadata, localePath } from '@/lib/i18n';

async function answer(questionId: string, slug: string, formData: FormData) {
  'use server';
  const path = localePath(await getLocale(), `/soru/${slug}`);
  if (!(await hasMemberSession())) redirect(loginHref(`${path}#yanitla`));
  let failure: string | null = null;
  let sessionLost = false;
  try {
    await memberApi(`/questions/${questionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ body: formText(formData, 'body') }),
    });
  } catch (error) {
    if (error instanceof MemberSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'Yanıt gönderilemedi.';
  }
  if (sessionLost) redirect(loginHref(`${path}#yanitla`));
  revalidatePath(path);
  if (failure) redirect(`${path}?hata=${encodeURIComponent(failure)}#yanitla`);
  redirect(`${path}#yanitlar`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const item = await getQuestion(slug);
  return item
    ? localeMetadata(locale, `/soru/${item.slug}`, {
        title: item.title,
        description: item.body.slice(0, 155),
        indexable: item.indexability === 'INDEX',
        openGraph: {
          title: item.title,
          description: item.body.slice(0, 155),
          images: item.images?.[0]
            ? [{ url: item.images[0].url, alt: item.images[0].altText }]
            : [],
        },
      })
    : {};
}
export const revalidate = 300;
export const dynamicParams = true;

/** Prebuilds the indexable slugs at deploy time; new ones render on first request. */
export async function generateStaticParams() {
  const items = await getQuestions({ tab: 'new', pageSize: 50 });
  return items
    .filter((item) => item.indexability === 'INDEX')
    .map((item) => ({ locale: 'tr', slug: item.slug }));
}

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const { slug } = await params;
  const item = await getQuestion(slug);
  if (!item) notFound();
  const path = p(`/soru/${item.slug}`);
  const profile = item.author.profile;
  const images = item.images ?? [];
  const jsonLd = qaPageJsonLd({
    question: item.title,
    body: item.body,
    url: absoluteUrl(path),
    authorName: profile?.displayName,
    dateCreated: item.publishedAt ?? item.createdAt,
    answers: (item.answers ?? []).map((entry) => ({
      body: entry.body,
      url: `${absoluteUrl(path)}#yanit-${entry.id}`,
      accepted: entry.id === item.acceptedAnswerId,
      authorName: entry.author.profile?.displayName,
      upvoteCount: entry.helpfulCount,
      dateCreated: entry.createdAt,
    })),
  });
  const structuredData = [
    breadcrumbJsonLd([
      { name: 'Ana sayfa', url: absoluteUrl(p('/')) },
      { name: 'Sorular', url: absoluteUrl(p('/sorular')) },
      { name: item.title, url: absoluteUrl(path) },
    ]),
    ...(jsonLd ? [jsonLd] : []),
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
          { label: 'Sorular', href: p('/sorular') },
          { label: item.title },
        ]}
      />
      <Flash />
      <Card className="mt-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <UserMiniProfile
            name={profile?.displayName ?? 'Topluluk üyesi'}
            username={profile?.username}
            href={authorHref(locale, profile)}
            avatarUrl={profile?.avatarUrl}
            meta={getDictionary(locale).author.verbs.asked}
          />
          <Badge className={item.status === 'RESOLVED' ? 'chip-mint' : 'chip-sky'}>
            {item.status === 'RESOLVED'
              ? 'Çözüldü'
              : item.answerCount
                ? 'Yanıtlandı'
                : 'Yanıt bekliyor'}
          </Badge>
        </div>
        <h1 className="mt-6 font-serif text-3xl leading-tight sm:text-4xl">{item.title}</h1>
        <p className="mt-5 whitespace-pre-line text-[16px] leading-8">{item.body}</p>
        {images.length > 0 && (
          <div className={`mt-6 grid gap-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {images.map((image) => (
              <span key={image.id} className="img-frame aspect-[4/3] w-full rounded-2xl">
                <SmartImage
                  src={image.url}
                  alt={image.altText}
                  sizes="(max-width: 768px) 100vw, 360px"
                />
              </span>
            ))}
          </div>
        )}
        {item.concept && (
          <Link
            href={p(`/konsept/${item.concept.slug}`)}
            className="mt-6 block rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm"
          >
            <span className="font-semibold text-sky-900">İlgili konsept:</span> {item.concept.title}{' '}
            →
          </Link>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-[var(--line)] pt-3">
          <SessionGate
            fallback={
              <>
                <span className="community-action">
                  <Icon name="heart" size={17} /> {item.reactionCount}
                </span>
                <span className="community-action">
                  <Icon name="comment" size={17} /> {item.answerCount} yanıt
                </span>
                <Link href={loginHref(path)} className="community-action">
                  <Icon name="bookmark" size={17} /> Kaydet
                </Link>
                <Link href={loginHref(path)} className="community-action">
                  <Icon name="bell" size={17} /> Takip et
                </Link>
              </>
            }
          >
            <LikeToggle
              contentType="QUESTION"
              contentId={item.id}
              returnTo={path}
              count={item.reactionCount}
            />
            <SaveToggle contentType="QUESTION" contentId={item.id} returnTo={path} />
            <QuestionFollowToggle questionId={item.id} returnTo={path} />
          </SessionGate>
          <ReportForm contentType="QUESTION" contentId={item.id} returnTo={path} />
        </div>
      </Card>
      <section className="mt-8" id="yanitlar">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{item.answerCount} yanıt</h2>
          {item.status !== 'RESOLVED' && item.answers?.length ? (
            <OwnerGate username={profile?.username}>
              <span className="text-xs text-[var(--muted)]">
                En faydalı yanıtı kabul ederek soruyu çözüldü olarak işaretleyebilirsin.
              </span>
            </OwnerGate>
          ) : null}
        </div>
        <div className="space-y-4">
          {item.answers?.map((entry) => (
            <div key={entry.id} id={`yanit-${entry.id}`}>
              <AnswerCard
                body={entry.body}
                authorName={entry.author.profile?.displayName ?? 'Topluluk üyesi'}
                username={entry.author.profile?.username}
                helpful={entry.helpfulCount}
                accepted={item.acceptedAnswerId === entry.id}
              />
              {item.acceptedAnswerId !== entry.id && (
                <OwnerGate username={profile?.username}>
                  <form action={acceptAnswerAction} className="-mt-3 flex justify-end px-4 pb-1">
                    <input type="hidden" name="questionId" value={item.id} />
                    <input type="hidden" name="answerId" value={entry.id} />
                    <input type="hidden" name="returnTo" value={`${path}#yanitlar`} />
                    <button type="submit" className="community-action is-active">
                      <Icon name="check" size={16} /> Bu yanıtı kabul et
                    </button>
                  </form>
                </OwnerGate>
              )}
            </div>
          ))}
          {!item.answers?.length && (
            <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
              Henüz yanıt yok. Deneyimine dayanan ilk yanıtı sen yazabilirsin.
            </p>
          )}
        </div>
        <div id="yanitla" className="mt-5">
          <SessionGate
            fallback={
              <div className="rounded-2xl bg-[#f7f3ec] p-5 text-sm leading-6">
                Yanıt yazmak için{' '}
                <Link
                  href={loginHref(`${path}#yanitla`)}
                  className="font-semibold text-[var(--accent-strong)]"
                >
                  giriş yap
                </Link>
                .
              </div>
            }
          >
            <form
              action={answer.bind(null, item.id, item.slug)}
              className="grid gap-3 rounded-2xl bg-[#f7f3ec] p-5"
            >
              <TextArea
                label="Yanıtın"
                name="body"
                required
                minLength={20}
                maxLength={10000}
                rows={5}
                placeholder="Deneyimine dayanarak uygulanabilir bir yanıt yaz…"
              />
              <button className="justify-self-start rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white">
                Yanıtı gönder
              </button>
            </form>
          </SessionGate>
        </div>
      </section>
    </DetailShell>
  );
}
