import { permanentRedirect } from 'next/navigation';
import { asLocale, localePath } from '@/lib/i18n';

export default async function LegacyStoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  permanentRedirect(localePath(asLocale((await params).locale), '/deneyimler'));
}
