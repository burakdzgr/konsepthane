import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Badge, Card } from '@ilham/ui';
import { AuthRequired } from '@/components/auth-modal';
import { Flash } from '@/components/engagement';
import { PageHeader } from '@/components/community-layout';
import { getLinkedProviders, getMember, requestPasswordSetup, unlinkProvider } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

/** Personal account settings: e-mail, linked identity providers, password. Cookie-based, noindex. */
export const dynamic = 'force-dynamic';

async function unlinkAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  const base = localePath(locale, '/hesap');
  try {
    await unlinkProvider(formText(formData, 'provider'));
  } catch (error) {
    redirect(
      `${base}?hata=${encodeURIComponent(error instanceof Error ? error.message : 'İşlem tamamlanamadı.')}`,
    );
  }
  redirect(`${base}?mesaj=${encodeURIComponent(getDictionary(locale).pages.account.unlinked)}`);
}

async function passwordSetupAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  const base = localePath(locale, '/hesap');
  try {
    await requestPasswordSetup();
  } catch (error) {
    redirect(
      `${base}?hata=${encodeURIComponent(error instanceof Error ? error.message : 'İşlem tamamlanamadı.')}`,
    );
  }
  redirect(
    `${base}?mesaj=${encodeURIComponent(getDictionary(locale).pages.account.passwordLinkSent)}`,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/hesap', {
    title: getDictionary(locale).pages.account.title,
    robots: { index: false, follow: false },
  });
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = asLocale((await params).locale);
  const t = getDictionary(locale).pages.account;
  const p = (path: string) => localePath(locale, path);
  const member = await getMember();
  if (!member) {
    const modal = getDictionary(locale).pages.authModal;
    return (
      <>
        <PageHeader eyebrow={t.eyebrow} title={t.heading} description={t.description} />
        <AuthRequired next={p('/hesap')} title={modal.requiredTitle} text={modal.requiredText} />
      </>
    );
  }
  const linked = await getLinkedProviders();
  const google = linked?.providers.find((entry) => entry.provider === 'GOOGLE');
  const hasPassword = linked?.hasPassword ?? true;
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.heading} description={t.description} />
      <div className="wrap grid max-w-3xl gap-6 py-8">
        <Flash />
        <Card className="p-6">
          <p className="section-eyebrow">{t.identity}</p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t.email}
              </dt>
              <dd className="mt-1 font-semibold">{linked?.email ?? member.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {t.password}
              </dt>
              <dd className="mt-1 flex flex-wrap items-center gap-3">
                {hasPassword ? (
                  <>
                    <Badge className="chip-mint">{t.passwordSet}</Badge>
                    <Link
                      href={p('/sifremi-unuttum')}
                      className="text-sm font-semibold text-[var(--accent-strong)]"
                    >
                      {t.changePassword}
                    </Link>
                  </>
                ) : (
                  <>
                    <Badge>{t.passwordMissing}</Badge>
                    <form action={passwordSetupAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <button type="submit" className="community-action is-active">
                        {t.createPassword}
                      </button>
                    </form>
                  </>
                )}
              </dd>
            </div>
          </dl>
        </Card>
        <Card className="p-6">
          <p className="section-eyebrow">{t.linkedAccounts}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{t.linkedText}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] p-4">
            <div>
              <p className="font-semibold">Google</p>
              <p className="text-xs text-[var(--muted)]">
                {google ? `${t.linked}${google.email ? ` · ${google.email}` : ''}` : t.notLinked}
              </p>
            </div>
            {google ? (
              hasPassword ? (
                <form action={unlinkAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="provider" value="google" />
                  <button type="submit" className="community-action is-remove">
                    {t.unlink}
                  </button>
                </form>
              ) : (
                <span className="text-xs text-[var(--muted)]">{t.unlinkNeedsPassword}</span>
              )
            ) : (
              <a
                href={`/api/auth/google?next=${encodeURIComponent(p('/hesap'))}`}
                className="community-action"
              >
                {t.linkGoogle}
              </a>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
