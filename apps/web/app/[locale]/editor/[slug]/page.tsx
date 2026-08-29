import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Breadcrumb, ConceptCard, Icon } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd, profilePageJsonLd } from '@ilham/seo';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { getEditor, getEditors } from '@/lib/editors';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

/**
 * Public editor profile. Only active, public editors resolve (the API 404s otherwise), so the
 * page is `index,follow`, self-canonical and in the `editorler` sitemap shard. Member profiles
 * live at `/uye/<username>` and stay noindex.
 */
export const revalidate = 300;

export async function generateStaticParams() {
  const editors = await getEditors();
  return editors.flatMap((editor) =>
    editor.username ? [{ locale: 'tr', slug: editor.username }] : [],
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const editor = await getEditor(slug);
  if (!editor) return { robots: { index: false, follow: false } };
  const t = getDictionary(locale).pages.editor;
  const title = t.title(editor.displayName, editor.jobTitle ?? t.defaultJobTitle);
  const description =
    editor.bio ?? t.metaDescription(editor.displayName, editor.expertise.join(', '));
  return localeMetadata(locale, `/editor/${slug}`, {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      ...(editor.avatarUrl ? { images: [{ url: editor.avatarUrl, alt: editor.displayName }] } : {}),
    },
  });
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = asLocale(localeParam);
  const dictionary = getDictionary(locale);
  const t = dictionary.pages.editor;
  const p = (path: string) => localePath(locale, path);
  const editor = await getEditor(slug);
  if (!editor) notFound();
  const path = p(`/editor/${slug}`);
  const url = absoluteUrl(path);
  const sameAs = Object.values(editor.socialLinks ?? {}).filter((value) =>
    /^https?:\/\//.test(value),
  );
  if (editor.websiteUrl && /^https?:\/\//.test(editor.websiteUrl)) sameAs.push(editor.websiteUrl);
  const jsonLd = [
    breadcrumbJsonLd([
      { name: dictionary.nav.home, url: absoluteUrl(p('/')) },
      { name: t.eyebrow, url: absoluteUrl(p('/editoryal-standartlar')) },
      { name: editor.displayName, url },
    ]),
    profilePageJsonLd({
      url,
      name: editor.displayName,
      description: editor.bio,
      image: editor.avatarUrl ? absoluteUrl(editor.avatarUrl) : null,
      jobTitle: editor.jobTitle ?? t.defaultJobTitle,
      sameAs,
      dateCreated: editor.memberSince,
      dateModified: editor.lastPublishedAt ?? editor.updatedAt,
      worksForUrl: absoluteUrl(p('/')),
    }),
  ];
  const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-GB';
  const format = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <header className="page-header">
        <div className="wrap py-10 sm:py-14">
          <Breadcrumb
            label={dictionary.pages.breadcrumbLabel}
            items={[
              { label: dictionary.nav.home, href: p('/') },
              { label: t.eyebrow, href: p('/editoryal-standartlar') },
              { label: editor.displayName },
            ]}
          />
          <div className="editor-hero mt-8">
            <Avatar name={editor.displayName} src={editor.avatarUrl ?? undefined} />
            <div className="min-w-0">
              <p className="section-eyebrow">{t.eyebrow}</p>
              <h1 className="mt-2">{editor.displayName}</h1>
              <p className="editor-hero-role">{editor.jobTitle ?? t.defaultJobTitle}</p>
              {editor.bio ? <p className="mt-4 max-w-2xl leading-7 text-[var(--ink-2)]">{editor.bio}</p> : null}
              <dl className="editor-facts">
                {editor.expertise.length ? (
                  <div>
                    <dt>{t.expertise}</dt>
                    <dd>{editor.expertise.join(' · ')}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>{t.contentCount}</dt>
                  <dd>{t.contentCountValue(editor.concepts.length, editor.guides.length)}</dd>
                </div>
                {editor.lastPublishedAt ? (
                  <div>
                    <dt>{t.lastPublished}</dt>
                    <dd>{format(editor.lastPublishedAt)}</dd>
                  </div>
                ) : null}
                {sameAs.length ? (
                  <div>
                    <dt>{t.links}</dt>
                    <dd className="flex flex-wrap gap-2">
                      {sameAs.map((link) => (
                        <a key={link} href={link} rel="me noopener noreferrer" target="_blank">
                          {new URL(link).hostname.replace(/^www\./, '')}
                        </a>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        </div>
      </header>
      <div className="wrap py-10">
        {editor.longBio ? (
          <section className="prose-trust max-w-3xl">
            <h2>{t.about(editor.displayName)}</h2>
            {editor.longBio.split(/\n{2,}/).map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </section>
        ) : null}
        <section className="mt-12">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">{t.conceptsEyebrow}</p>
              <h2>{t.conceptsTitle}</h2>
            </div>
          </div>
          {editor.concepts.length ? (
            <div className="card-grid-4 mt-7">
              {editor.concepts.map((concept) => (
                <ConceptCard
                  key={concept.id}
                  title={concept.title}
                  summary={concept.summary}
                  href={p(`/konsept/${concept.slug}`)}
                  imageUrl={concept.heroImageUrl}
                  imageAlt={concept.heroImageAlt}
                  meta={concept.category.name}
                  labels={{
                    tried: dictionary.cards.tried,
                    questions: dictionary.cards.questions,
                    save: dictionary.cards.save,
                  }}
                  LinkComponent={Link}
                  ImageComponent={SmartImage}
                  imageSizes={cardSizes}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[var(--muted)]">{t.noConcepts}</p>
          )}
        </section>
        {editor.guides.length ? (
          <section className="mt-14 max-w-3xl">
            <p className="section-eyebrow">{t.guidesEyebrow}</p>
            <h2>{t.guidesTitle}</h2>
            <ul className="mt-5 grid gap-3">
              {editor.guides.map((guide) => (
                <li key={guide.id} className="surface p-4">
                  <Link href={p(`/rehber/${guide.slug}`)} className="font-semibold hover:text-[var(--accent-strong)]">
                    {guide.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--muted)]">{guide.summary}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    <Icon name="check" size={12} /> {format(guide.publishedAt ?? guide.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
