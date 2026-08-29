import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { GoogleButton } from '@/components/google-button';
import { registerMember } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

async function registerAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  const base = localePath(locale, '/kayit');
  try {
    await registerMember(
      formText(formData, 'email'),
      formText(formData, 'password'),
      formText(formData, 'displayName'),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
    redirect(`${base}?hata=${encodeURIComponent(message)}`);
  }
  redirect(`${base}?gonderildi=1`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/kayit', {
    title: getDictionary(locale).pages.register.title,
    robots: { index: false, follow: false },
  });
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ hata?: string; gonderildi?: string }>;
}) {
  const [{ locale: localeParam }, { hata, gonderildi }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.register;
  const p = (path: string) => localePath(locale, path);
  return (
    <div className="wrap grid min-h-[70vh] place-items-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="section-eyebrow">{t.eyebrow}</p>
        {gonderildi ? (
          <>
            <h1 className="mt-2 text-3xl">{t.successTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.successText}</p>
            <Link href={p('/giris')} className="btn btn-ghost mt-6">
              {t.login}
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-4xl">{t.heading}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.description}</p>
            {hata && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              >
                {hata}
              </p>
            )}
            <div className="mt-7 grid gap-3">
              <GoogleButton
                href={`/api/auth/google?next=${encodeURIComponent(p('/'))}`}
                label={getDictionary(locale).pages.login.google}
                loadingLabel={getDictionary(locale).pages.login.googleLoading}
              />
              <p className="auth-divider">
                <span>{getDictionary(locale).pages.login.or}</span>
              </p>
            </div>
            <form action={registerAction} className="mt-4 grid gap-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm font-semibold">
                {t.name}
                <Input
                  name="displayName"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t.email}
                <Input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {t.password}
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                />
                <span className="text-xs font-normal text-[var(--muted)]">{t.passwordHint}</span>
              </label>
              <p className="text-xs leading-5 text-[var(--muted)]">
                {t.terms}{' '}
                <Link href={p('/kullanim-kosullari')} className="underline">
                  {getDictionary(locale).nav.footer.terms}
                </Link>{' '}
                ·{' '}
                <Link href={p('/kvkk-aydinlatma')} className="underline">
                  {getDictionary(locale).nav.footer.kvkk}
                </Link>
              </p>
              <Button type="submit">{t.submit}</Button>
            </form>
            <p className="mt-6 text-sm">
              {t.haveAccount}{' '}
              <Link href={p('/giris')} className="font-semibold text-[var(--accent-strong)]">
                {t.login}
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
