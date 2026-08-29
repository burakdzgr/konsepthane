import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { Card, EmptyState, ExperienceCard, UserMiniProfile } from '@ilham/ui';
import { PageHeader } from '@/components/community-layout';
import { SmartImage, cardSizes } from '@/components/smart-image';
import { getMember } from '@/lib/auth';
import { getProfile } from '@/lib/community';
import { asLocale, localePath } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const item = await getProfile((await params).username);
  return item
    ? { title: item.displayName, robots: { index: false, follow: true } }
    : { robots: { index: false, follow: false } };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = asLocale(localeParam);
  const p = (path: string) => localePath(locale, path);
  const [{ username }, member] = await Promise.all([params, getMember()]);
  const item = await getProfile(username);
  if (!item) notFound();
  // Editors have a public, indexable page; the member URL only redirects there.
  if (item.kind === 'EDITOR' && item.editorActive !== false)
    permanentRedirect(p(`/editor/${username}`));
  const isSelf = member?.profile?.username === item.username;
  const tabs = [
    ['Paylaşımlarım', '#paylasimlar', item.concepts.length],
    ['Deneyimlerim', '#deneyimler', item.experiences.length],
    ['Sorularım', '#sorular', item.questions.length],
    ['Cevaplarım', '#cevaplar', item.answers.length],
    ['Koleksiyonlarım', '#koleksiyonlar', item.collections.length],
  ] as const;
  return (
    <>
      <PageHeader
        eyebrow={isSelf ? 'Senin profilin' : 'Konsepthane üyesi'}
        title={item.displayName}
        description={
          item.bio ?? 'Kutlama fikirlerini uygulayan ve deneyimlerini paylaşan topluluk üyesi.'
        }
        action={
          isSelf ? (
            <Link href={p('/olustur?tur=deneyim')} className="btn btn-primary">
              Deneyim paylaş
            </Link>
          ) : undefined
        }
      />
      <div className="wrap grid gap-7 py-8 md:grid-cols-[260px_1fr]">
        <Card className="h-fit p-5 shadow-none">
          <UserMiniProfile
            name={item.displayName}
            username={item.username}
            avatarUrl={item.avatarUrl}
            meta={item.username ? `@${item.username}` : undefined}
          />
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-[var(--muted)]">Katkı</dt>
              <dd className="font-semibold">{item.contributionCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Takipçi</dt>
              <dd className="font-semibold">{item.followerCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Takip</dt>
              <dd className="font-semibold">{item.followingCount}</dd>
            </div>
          </dl>
          {item.city && <p className="mt-4 text-sm text-[var(--muted)]">{item.city}</p>}
        </Card>
        <div className="min-w-0">
          <nav
            aria-label="Profil bölümleri"
            className="flex gap-1 overflow-x-auto border-b border-[var(--line)] text-sm font-semibold"
          >
            {tabs.map(([label, href, count]) => (
              <a key={href} href={href} className="whitespace-nowrap px-4 py-3">
                {label} <span className="text-[var(--muted)]">{count}</span>
              </a>
            ))}
          </nav>
          <section id="deneyimler" className="pt-8">
            <h2 className="font-serif text-3xl">Deneyimlerim</h2>
            {item.experiences.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {item.experiences.map((entry) => (
                  <ExperienceCard
                    LinkComponent={Link}
                    ImageComponent={SmartImage}
                    imageSizes={cardSizes}
                    key={entry.id}
                    title={entry.title}
                    summary={entry.summary ?? entry.body}
                    href={p(`/deneyim/${entry.slug}`)}
                    imageUrl={
                      entry.images[0]?.url ??
                      entry.heroImageUrl ??
                      '/placeholders/home-birthday.svg'
                    }
                    imageAlt={entry.images[0]?.altText ?? entry.title}
                    authorName={item.displayName}
                    meta={[entry.ageLabel, entry.themeVariation, entry.venueType]
                      .filter(Boolean)
                      .join(' · ')}
                    reactions={entry.reactionCount}
                    comments={entry.commentCount}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Henüz yayınlanmış deneyim yok"
                  description="Onaylanan fotoğraflı deneyimler burada görünür."
                />
              </div>
            )}
          </section>
          <section id="paylasimlar" className="pt-10">
            <h2 className="font-serif text-3xl">Paylaşımlarım</h2>
            <div className="mt-4 space-y-2">
              {item.concepts.length ? (
                item.concepts.map((entry) => (
                  <Link
                    key={entry.id}
                    href={p(`/konsept/${entry.slug}`)}
                    className="block rounded-2xl border bg-white p-4 font-medium hover:border-[var(--accent)]"
                  >
                    {entry.title}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Yayınlanmış editoryal içerik yok.</p>
              )}
            </div>
          </section>
          <section id="sorular" className="pt-10">
            <h2 className="font-serif text-3xl">Sorularım</h2>
            <div className="mt-4 space-y-2">
              {item.questions.length ? (
                item.questions.map((entry) => (
                  <Link
                    key={entry.id}
                    href={p(`/soru/${entry.slug}`)}
                    className="block rounded-2xl border bg-white p-4 font-medium hover:border-[var(--accent)]"
                  >
                    {entry.title}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Henüz soru sorulmamış.</p>
              )}
            </div>
          </section>
          <section id="cevaplar" className="pt-10">
            <h2 className="font-serif text-3xl">Cevaplarım</h2>
            <div className="mt-4 space-y-2">
              {item.answers.length ? (
                item.answers.map((entry) => (
                  <Link
                    key={entry.id}
                    href={p(`/soru/${entry.question.slug}`)}
                    className="block rounded-2xl border bg-white p-4"
                  >
                    <strong>{entry.question.title}</strong>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{entry.body}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Henüz yanıt yazılmamış.</p>
              )}
            </div>
          </section>
          <section id="koleksiyonlar" className="pt-10">
            <h2 className="font-serif text-3xl">Koleksiyonlarım</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {item.collections.length ? (
                item.collections.map((entry) => (
                  <Link
                    key={entry.id}
                    href={p(`/koleksiyon/${entry.slug}`)}
                    className="rounded-2xl border bg-white p-5"
                  >
                    <strong>{entry.title}</strong>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {entry.itemCount} kayıt · Herkese açık
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Herkese açık pano yok.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
