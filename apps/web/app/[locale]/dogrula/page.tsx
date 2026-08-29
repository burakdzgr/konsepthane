import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { resendVerification, verifyEmailToken } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

async function resendAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  try {
    await resendVerification(formText(formData, 'email'));
  } catch {
    /* identical response either way — never reveal whether the address exists */
  }
  redirect(`${localePath(locale, '/dogrula')}?gonderildi=1`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/dogrula', {
    title: getDictionary(locale).pages.verify.title,
    robots: { index: false, follow: false },
  });
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; gonderildi?: string }>;
}) {
  const [{ locale: localeParam }, { token, gonderildi }] = await Promise.all([
    params,
    searchParams,
  ]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.verify;
  const p = (path: string) => localePath(locale, path);
  let state: 'form' | 'ok' | 'failed' = 'form';
  if (token) {
    try {
      await verifyEmailToken(token);
      state = 'ok';
    } catch {
      state = 'failed';
    }
  }
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="section-eyebrow">{t.heading}</p>
        {state === 'ok' ? (
          <>
            <h1 className="mt-2 text-3xl">{t.successTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.successText}</p>
            <Link href={p('/giris')} className="btn btn-primary mt-6">
              {t.login}
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl">{state === 'failed' ? t.failedTitle : t.resend}</h1>
            {state === 'failed' && (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.failedText}</p>
            )}
            {gonderildi && (
              <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {t.resent}
              </p>
            )}
            <form action={resendAction} className="mt-6 grid gap-4">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm font-semibold">
                {t.resendEmail}
                <Input name="email" type="email" autoComplete="email" required />
              </label>
              <Button type="submit">{t.resend}</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
