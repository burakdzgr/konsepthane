import { permanentRedirect } from 'next/navigation';
import { asLocale, localePath } from '@/lib/i18n';

/** `/organizasyon/[slug]` is the legacy experience path; the canonical one is `/deneyim/[slug]`. */
export default async function LegacyStoryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  permanentRedirect(localePath(asLocale(locale), `/deneyim/${slug}`));
}
