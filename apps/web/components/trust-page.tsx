import Link from 'next/link';
import { Breadcrumb } from '@ilham/ui';
import { absoluteUrl, breadcrumbJsonLd } from '@ilham/seo';
import { PageHeader } from '@/components/community-layout';
import type { TrustPageContent } from '@/content/trust';
import { getDictionary, localePath, type Locale } from '@/lib/i18n';

/** Shared renderer for trust pages (about, contact, privacy, terms): reading column + sections. */
export function TrustPage({
  locale,
  path,
  content,
  related,
}: {
  locale: Locale;
  path: string;
  content: TrustPageContent;
  related: Array<[label: string, href: string]>;
}) {
  const t = getDictionary(locale);
  const p = (value: string) => localePath(locale, value);
  const jsonLd = breadcrumbJsonLd([
    { name: t.nav.home, url: absoluteUrl(p('/')) },
    { name: content.title, url: absoluteUrl(p(path)) },
  ]);
  const updated = new Date(content.updatedAt).toLocaleDateString(
    locale === 'tr' ? 'tr-TR' : 'en-GB',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
      />
      <div className="wrap reading py-10">
        <Breadcrumb
          label={t.pages.breadcrumbLabel}
          items={[{ label: t.nav.home, href: p('/') }, { label: content.title }]}
        />
        <p className="mt-4 text-sm text-[var(--muted)]">
          {t.pages.trust.updated}: <time dateTime={content.updatedAt}>{updated}</time>
        </p>
        <div className="prose-trust mt-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet.slice(0, 40)}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <nav aria-label={t.pages.trust.related} className="mt-12 flex flex-wrap gap-2">
          {related.map(([label, href]) => (
            <Link key={href} href={p(href)} className="btn btn-ghost">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
