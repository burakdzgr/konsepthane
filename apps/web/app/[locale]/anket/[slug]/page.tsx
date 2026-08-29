import { notFound } from 'next/navigation';
import { Card, PollCard, UserMiniProfile } from '@ilham/ui';
import { DetailShell } from '@/components/community-layout';
import { getPoll } from '@/lib/community';
import { asLocale, localePath } from '@/lib/i18n';

export const metadata = { robots: 'noindex,follow' };
export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const item = await getPoll((await params).slug);
  if (!item) notFound();
  return (
    <DetailShell locale={locale}>
      <PollCard
        title={item.title}
        body={item.body}
        href={p(`/anket/${item.slug}`)}
        options={item.options}
        voteCount={item.voteCount}
      />
      <Card className="mt-4 p-5 shadow-none">
        <UserMiniProfile
          name={item.author.profile?.displayName ?? 'Topluluk üyesi'}
          username={item.author.profile?.username}
          meta="Anketi oluşturan"
        />
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Oy kullanmak için üye girişi gerekir.
        </p>
      </Card>
    </DetailShell>
  );
}
