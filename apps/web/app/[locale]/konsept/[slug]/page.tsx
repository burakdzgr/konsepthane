import type { Metadata } from 'next';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Breadcrumb,
  Card,
  CommentThread,
  ExperienceCard,
  Icon,
  QuestionCard,
  TextArea,
} from '@ilham/ui';
import { absoluteUrl, articleJsonLd as buildArticleJsonLd, breadcrumbJsonLd } from '@ilham/seo';
import { AuthorBox, EditorialByline } from '@/components/author-byline';
import { ConceptGrid } from '@/components/concept-discovery';
import { ContributionSelector } from '@/components/contribution-selector';
import {
  CollectionPicker,
  Flash,
  LikeToggle,
  ReportForm,
  SessionGate,
} from '@/components/engagement';
import { EditorialSources, officialEditorialSourceUrls } from '@/components/editorial-sources';
import { SmartImage, cardSizes, gallerySizes } from '@/components/smart-image';
import { getConcept, getConcepts } from '@/lib/api';
import { authorHref, isEditorAuthor, readingMinutes } from '@/lib/editors';
import { MemberSessionError, hasMemberSession, loginHref, memberApi } from '@/lib/auth';
import { formText } from '@/lib/form';
import { uploadExperiencePhotos } from '@/lib/media';
import { asLocale, getDictionary, getLocale, localeMetadata, localePath } from '@/lib/i18n';
import { applySeoOverride, redirectIfLegacyPath } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const concept = await getConcept(slug);
  if (!concept) return {};
  const meta = applySeoOverride(concept.seo, {
    title: concept.title,
    description: concept.summary,
  });
  return localeMetadata(locale, `/konsept/${concept.slug}`, {
    title: meta.title,
    description: meta.description,
    indexable: meta.indexable,
    ...(meta.indexable ? {} : { robots: { index: false, follow: meta.follow } }),
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: 'article',
      ...(concept.heroImageUrl
        ? { images: [{ url: concept.heroImageUrl, alt: concept.heroImageAlt ?? concept.title }] }
        : {}),
    },
  });
}

async function contribute(conceptId: string, conceptSlug: string, formData: FormData) {
  'use server';
  const locale = await getLocale();
  const path = localePath(locale, `/konsept/${conceptSlug}`);
  if (!(await hasMemberSession())) redirect(loginHref(`${path}#katki`));
  const kind = formText(formData, 'kind');
  const body = formText(formData, 'body');
  const title = formText(formData, 'title');
  const parentId = formText(formData, 'parentId') || undefined;
  let destination = `${path}#yorumlar`;
  let failure: string | null = null;
  let sessionLost = false;
  try {
    if (kind === 'comment') {
      await memberApi('/comments', {
        method: 'POST',
        body: JSON.stringify({ contentType: 'INSPIRATION', contentId: conceptId, body, parentId }),
      });
    } else if (kind === 'question') {
      const photos = formData
        .getAll('photos')
        .filter((value): value is File => value instanceof File && value.size > 0);
      const imageUrls = photos.length ? await uploadExperiencePhotos(formData) : [];
      const item = await memberApi<{ slug: string }>('/questions', {
        method: 'POST',
        body: JSON.stringify({ title, body, conceptId, imageUrls }),
      });
      destination = localePath(locale, `/soru/${item.slug}`);
    } else if (kind === 'experience') {
      const imageUrls = await uploadExperiencePhotos(formData);
      await memberApi('/experiences', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          conceptId,
          imageUrls,
          city: formText(formData, 'city') || undefined,
          venueType: formText(formData, 'venueType') || undefined,
          ageLabel: formText(formData, 'ageLabel') || undefined,
          guestCount: Number(formText(formData, 'guestCount')) || undefined,
          budgetLabel: formText(formData, 'budgetLabel') || undefined,
          colors: formText(formData, 'colors')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          tips: formText(formData, 'tips') || undefined,
          whatWorked: formText(formData, 'whatWorked') || undefined,
          whatWouldChange: formText(formData, 'whatWouldChange') || undefined,
          rightsConfirmed: formData.get('rightsConfirmed') === 'on',
        }),
      });
      destination = localePath(locale, '/deneyimler?gonderildi=1');
    }
  } catch (error) {
    if (error instanceof MemberSessionError) sessionLost = true;
    else failure = error instanceof Error ? error.message : 'Katkı gönderilemedi.';
  }
  if (sessionLost) redirect(loginHref(`${path}#katki`));
  revalidatePath(path);
  if (failure) redirect(`${path}?hata=${encodeURIComponent(failure)}#katki`);
  redirect(destination);
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const t = getDictionary(locale);
  const c = t.pages.concept;
  const [concept, allConcepts] = await Promise.all([
    getConcept(slug),
    getConcepts({ sort: 'popular', pageSize: 8 }),
  ]);
  if (!concept) {
    await redirectIfLegacyPath(locale, `/konsept/${slug}`);
    notFound();
  }
  const path = p(`/konsept/${concept.slug}`);
  const experiences = concept.experiences ?? [];
  const questions = concept.questions ?? [];
  const comments = concept.comments ?? [];
  const related = allConcepts
    .filter((item) => item.slug !== concept.slug)
    .sort((a, b) =>
      a.category.slug === concept.category.slug
        ? -1
        : b.category.slug === concept.category.slug
          ? 1
          : 0,
    )
    .slice(0, 3);
  const gallery = concept.images?.length
    ? concept.images
    : concept.heroImageUrl
      ? [
          {
            id: 'hero',
            url: concept.heroImageUrl,
            altText: concept.heroImageAlt ?? concept.title,
            sortOrder: 0,
          },
        ]
      : [];
  const jsonLd = breadcrumbJsonLd([
    { name: c.home, url: absoluteUrl(p('/')) },
    { name: concept.category.name, url: absoluteUrl(p(`/kategori/${concept.category.slug}`)) },
    { name: concept.title, url: absoluteUrl(path) },
  ]);
  const articleJsonLd = buildArticleJsonLd({
    url: absoluteUrl(path),
    headline: concept.title,
    description: concept.summary,
    images: gallery.map((image) => absoluteUrl(image.url)),
    datePublished: concept.publishedAt,
    dateModified: concept.updatedAt,
    // A real editor is a Person tied to the ProfilePage entity; otherwise the publisher signs.
    author: isEditorAuthor(concept.author?.profile)
      ? {
          type: 'Person',
          name: concept.author.profile.displayName,
          url: absoluteUrl(authorHref(locale, concept.author.profile) ?? '/'),
          id: `${absoluteUrl(authorHref(locale, concept.author.profile) ?? '/')}#person`,
        }
      : { type: 'Organization' },
    publisherUrl: absoluteUrl(p('/')),
    section: concept.category.name,
    language: locale,
    citations: officialEditorialSourceUrls,
  });
  const palette = concept.colorPalette ?? [];
  const sections = [
    [c.sections.decoration, concept.decorationIdeas],
    [c.sections.table, concept.tableSetup],
    [c.sections.balloons, concept.balloonIdeas],
    [c.sections.cake, concept.cakeIdeas],
    [c.sections.venue, concept.venueSuggestions],
    [c.sections.tips, concept.practicalTips],
    [c.sections.alternatives, concept.alternatives],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const stats = [
    [concept.saveCount, c.statSaved],
    [experiences.length || concept.experienceCount, c.statTried],
    [questions.length || concept.questionCount, c.statAsked],
    [comments.length || concept.commentCount, c.statComments],
  ].filter(([value]) => Number(value) > 0);
  const budget =
    concept.budgetMin || concept.budgetMax
      ? `${Number(concept.budgetMin ?? 0).toLocaleString('tr-TR')} – ${Number(concept.budgetMax ?? 0).toLocaleString('tr-TR')} ${concept.currency}`
      : null;
  const contributeAction = contribute.bind(null, concept.id, concept.slug);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLd, articleJsonLd]).replace(/</g, '\\u003c'),
        }}
      />
      <header className="article-hero">
        <div className="wrap py-10 sm:py-14">
          <Breadcrumb
            items={[
              { label: c.home, href: p('/') },
              { label: concept.category.name, href: p(`/kategori/${concept.category.slug}`) },
              { label: concept.title },
            ]}
          />
          <p className="section-eyebrow mt-9">
            {concept.category.name} · {c.editorial}
          </p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-[1.08] tracking-[-.045em] sm:text-6xl">
            {concept.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--muted)]">{concept.summary}</p>
          <div className="mt-6">
            <EditorialByline
              locale={locale}
              author={concept.author?.profile}
              readingMinutes={readingMinutes(
                concept.introduction,
                concept.description,
                concept.decorationIdeas,
                concept.tableSetup,
                concept.balloonIdeas,
                concept.cakeIdeas,
                concept.venueSuggestions,
                concept.practicalTips,
                concept.alternatives,
              )}
              publishedAt={concept.publishedAt}
              updatedAt={concept.updatedAt}
            />
            {budget && (
              <p className="mt-3 text-sm text-[var(--muted)]">
                {c.budget}: {budget}
              </p>
            )}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <CollectionPicker contentType="INSPIRATION" contentId={concept.id} returnTo={path} />
            <LikeToggle
              contentType="INSPIRATION"
              contentId={concept.id}
              returnTo={path}
              count={concept.reactionCount ?? 0}
            />
            <Link href="#deneyimler" className="btn btn-ghost">
              <Icon name="camera" size={16} /> {c.seeAdopters}
            </Link>
            <ReportForm contentType="INSPIRATION" contentId={concept.id} returnTo={path} />
          </div>
        </div>
      </header>

      <div className="wrap py-10">
        <div className={`editorial-gallery ${gallery.length > 1 ? 'has-multiple' : ''}`}>
          {gallery.slice(0, 3).map((image, index) => (
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
        {stats.length > 0 && (
          <div className="stat-strip mt-8">
            {stats.map(([value, label]) => (
              <div key={label}>
                <strong className="block text-xl">{value}</strong>
                <span className="text-xs text-[var(--muted)]">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="wrap reading py-10">
        <p className="editorial-lead">{concept.introduction ?? concept.description}</p>
        {concept.introduction && (
          <p className="mt-6 whitespace-pre-line text-lg leading-9 text-[var(--muted)]">
            {concept.description}
          </p>
        )}
        {palette.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-3xl">{c.palette}</h2>
            <div className="mt-5 flex flex-wrap gap-4">
              {palette.map((color) => (
                <div key={color.name} className="palette-swatch">
                  <span style={{ backgroundColor: color.hex }} />
                  <strong>{color.name}</strong>
                  <small>{color.hex}</small>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-12 space-y-12">
          {sections.map(([title, content]) => (
            <section key={title}>
              <h2 className="font-serif text-3xl">{title}</h2>
              <p className="mt-4 whitespace-pre-line text-lg leading-9 text-[var(--muted)]">
                {content}
              </p>
            </section>
          ))}
        </div>
        <EditorialSources locale={locale} />
      </section>

      <section className="experience-band mt-12" id="deneyimler">
        <div className="wrap py-14">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{c.adoptersEyebrow}</p>
              <h2>
                {experiences.length ? c.adoptersTitle(experiences.length) : c.adoptersEmptyTitle}
              </h2>
            </div>
            <a href="#katki" className="btn btn-primary">
              <Icon name="camera" size={16} /> {c.adoptersCta}
            </a>
          </div>
          {experiences.length ? (
            <div className="mt-8 card-grid-4">
              {experiences.map((item) => (
                <ExperienceCard
                  LinkComponent={Link}
                  ImageComponent={SmartImage}
                  imageSizes={cardSizes}
                  key={item.id}
                  title={item.title}
                  summary={item.summary ?? item.body}
                  href={p(`/deneyim/${item.slug}`)}
                  imageUrl={
                    item.images[0]?.url ?? item.heroImageUrl ?? '/placeholders/home-birthday.svg'
                  }
                  imageAlt={item.images[0]?.altText ?? item.title}
                  authorName={item.author.profile?.displayName ?? t.cards.communityMember}
                  authorAvatarUrl={item.author.profile?.avatarUrl}
                  badge={t.cards.realParty}
                  meta={[item.ageLabel, item.themeVariation, item.venueType]
                    .filter(Boolean)
                    .join(' · ')}
                  reactions={item.reactionCount}
                  comments={item.commentCount}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              {c.adoptersEmptyText}
            </p>
          )}
        </div>
      </section>

      <section className="wrap reading py-14" id="sorular">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{c.questionsEyebrow}</p>
            <h2>{c.questionsTitle}</h2>
          </div>
          <a href="#katki">
            {c.ask} <Icon name="arrow-right" size={16} />
          </a>
        </div>
        <div className="mt-7 space-y-4">
          {questions.length ? (
            questions.map((question) => (
              <QuestionCard
                LinkComponent={Link}
                ImageComponent={SmartImage}
                key={question.id}
                title={question.title}
                summary={question.body}
                href={p(`/soru/${question.slug}`)}
                imageUrl={question.images?.[0]?.url}
                authorName={question.author.profile?.displayName}
                username={question.author.profile?.username}
                reactions={question.reactionCount}
                responses={question.answerCount}
                meta={c.questionMeta}
              />
            ))
          ) : (
            <Card className="p-6 text-sm leading-6 text-[var(--muted)] shadow-none">
              {c.questionsEmpty}
            </Card>
          )}
        </div>
      </section>

      <section className="wrap reading py-12" id="yorumlar">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">{c.commentsEyebrow}</p>
            <h2>{c.commentsTitle}</h2>
          </div>
        </div>
        <div className="mt-7">
          {comments.length ? (
            <CommentThread
              comments={comments}
              renderReply={(comment) => (
                <SessionGate>
                  <details className="reply-form mt-2 text-xs font-semibold text-[var(--muted)]">
                    <summary className="cursor-pointer">{c.reply}</summary>
                    <form action={contributeAction} className="mt-2 grid gap-2">
                      <input type="hidden" name="kind" value="comment" />
                      <input type="hidden" name="parentId" value={comment.id} />
                      <TextArea name="body" required minLength={2} maxLength={3000} rows={3} />
                      <button
                        type="submit"
                        className="community-action is-active justify-self-start"
                      >
                        {c.sendReply}
                      </button>
                    </form>
                  </details>
                </SessionGate>
              )}
            />
          ) : (
            <Card className="p-6 text-sm text-[var(--muted)] shadow-none">{c.commentsEmpty}</Card>
          )}
        </div>
      </section>

      <section className="wrap reading py-10" id="katki">
        <Flash />
        <ContributionSelector
          conceptTitle={concept.title}
          action={contributeAction}
          loginHref={loginHref(`${path}#katki`)}
          labels={t.pages.contribution}
        />
      </section>

      <section className="wrap reading py-6">
        <AuthorBox locale={locale} author={concept.author?.profile} />
      </section>

      {concept.faq?.length ? (
        <section className="wrap reading py-14">
          <p className="section-eyebrow">{c.faqEyebrow}</p>
          <h2 className="mt-2 font-serif text-3xl">{c.faqTitle}</h2>
          <div className="mt-6 space-y-3">
            {concept.faq.map((item) => (
              <details
                key={item.question}
                className="rounded-2xl border border-[var(--line)] bg-white p-5"
              >
                <summary className="cursor-pointer font-semibold">{item.question}</summary>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="wrap py-14">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{c.relatedEyebrow}</p>
              <h2>{c.relatedTitle}</h2>
            </div>
            <Link href={p(`/kategori/${concept.category.slug}`)}>
              {c.allIn(concept.category.name)} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <ConceptGrid concepts={related} returnTo={path} className="mt-7 card-grid-4" />
        </section>
      ) : null}
    </article>
  );
}
