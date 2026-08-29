import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { resetPasswordWithToken } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

async function resetAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  const token = formText(formData, 'token');
  const base = localePath(locale, '/sifre-sifirla');
  try {
    await resetPasswordWithToken(token, formText(formData, 'password'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
    redirect(`${base}?token=${encodeURIComponent(token)}&hata=${encodeURIComponent(message)}`);
  }
  redirect(`${base}?tamam=1`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/sifre-sifirla', {
    title: getDictionary(locale).pages.reset.title,
    robots: { index: false, follow: false },
  });
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; hata?: string; tamam?: string }>;
}) {
  const [{ locale: localeParam }, { token, hata, tamam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.reset;
  const p = (path: string) => localePath(locale, path);
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="section-eyebrow">{t.eyebrow}</p>
        {tamam ? (
          <>
            <h1 className="mt-2 text-3xl">{t.doneTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.doneText}</p>
            <Link href={p('/giris')} className="btn btn-primary mt-6">
              {t.login}
            </Link>
          </>
        ) : !token ? (
          <>
            <h1 className="mt-2 text-3xl">{t.heading}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.invalid}</p>
            <Link href={p('/sifremi-unuttum')} className="btn btn-ghost mt-6">
              {getDictionary(locale).pages.forgot.submit}
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl">{t.heading}</h1>
            {hata && (
              <p
                role="alert"
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
              >
                {hata}
              </p>
            )}
            <form action={resetAction} className="mt-7 grid gap-5">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="token" value={token} />
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
              <Button type="submit">{t.submit}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
