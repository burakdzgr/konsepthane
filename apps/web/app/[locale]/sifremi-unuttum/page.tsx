import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { requestPasswordReset } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeMetadata, localePath } from '@/lib/i18n';

async function forgotAction(formData: FormData) {
  'use server';
  const locale = asLocale(formText(formData, 'locale'));
  try {
    await requestPasswordReset(formText(formData, 'email'));
  } catch {
    /* same outcome for unknown addresses */
  }
  redirect(`${localePath(locale, '/sifremi-unuttum')}?gonderildi=1`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/sifremi-unuttum', {
    title: getDictionary(locale).pages.forgot.title,
    robots: { index: false, follow: false },
  });
}

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ gonderildi?: string }>;
}) {
  const [{ locale: localeParam }, { gonderildi }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.forgot;
  const p = (path: string) => localePath(locale, path);
  return (
    <div className="wrap grid min-h-[60vh] place-items-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="section-eyebrow">{t.eyebrow}</p>
        {gonderildi ? (
          <>
            <h1 className="mt-2 text-3xl">{t.sentTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.sentText}</p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-3xl">{t.heading}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.description}</p>
            <form action={forgotAction} className="mt-7 grid gap-5">
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-2 text-sm font-semibold">
                {t.email}
                <Input name="email" type="email" autoComplete="email" required />
              </label>
              <Button type="submit">{t.submit}</Button>
            </form>
          </>
        )}
        <Link
          href={p('/giris')}
          className="mt-6 inline-block text-sm font-semibold text-[var(--accent-strong)]"
        >
          {t.back}
        </Link>
      </Card>
    </div>
  );
}
