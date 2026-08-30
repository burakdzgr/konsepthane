import type { Metadata } from 'next';
import { TrustPage } from '@/components/trust-page';
import { trustPages } from '@/content/trust';
import { asLocale, getDictionary, localeMetadata } from '@/lib/i18n';

const SLUG = 'iletisim' as const;
const PATH = `/${SLUG}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  const content = trustPages[SLUG][locale];
  return localeMetadata(locale, PATH, {
    title: content.title,
    description: content.description,
    openGraph: { title: content.title, description: content.description },
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale).nav.footer;
  return (
    <TrustPage
      locale={locale}
      path={PATH}
      content={trustPages[SLUG][locale]}
      related={
        [
          [t.about, '/hakkimizda'],
          [t.contact, '/iletisim'],
          [t.privacy, '/gizlilik'],
          [t.kvkk, '/kvkk-aydinlatma'],
          [t.cookies, '/cerez-politikasi'],
          [t.terms, '/kullanim-kosullari'],
          [t.editorialStandards, '/editoryal-standartlar'],
          [t.rules, '/topluluk-kurallari'],
        ].filter(([, href]) => href !== PATH) as Array<[string, string]>
      }
    />
  );
}
