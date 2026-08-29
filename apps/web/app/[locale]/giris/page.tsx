import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Button, Card, Input } from '@ilham/ui';
import { GoogleButton } from '@/components/google-button';
import { login } from '@/lib/auth';
import { formText } from '@/lib/form';
import { asLocale, getDictionary, localeFromPath, localeMetadata, localePath } from '@/lib/i18n';

function safeNext(value: string, fallback: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}

async function loginAction(formData: FormData) {
  'use server';
  const email = formText(formData, 'email');
  const password = formText(formData, 'password');
  const rawNext = formText(formData, 'next');
  const locale = localeFromPath(rawNext);
  const next = safeNext(rawNext, localePath(locale, '/'));
  let failure: string | null = null;
  try {
    await login(email, password);
  } catch (error) {
    failure = error instanceof Error && error.message === 'EMAIL_NOT_VERIFIED' ? 'dogrulama' : '1';
  }
  if (failure)
    redirect(`${localePath(locale, '/giris')}?hata=${failure}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = asLocale((await params).locale);
  return localeMetadata(locale, '/giris', {
    title: getDictionary(locale).pages.login.title,
    robots: { index: false, follow: false },
  });
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; hata?: string }>;
}) {
  const [{ locale: localeParam }, { next, hata }] = await Promise.all([params, searchParams]);
  const locale = asLocale(localeParam);
  const t = getDictionary(locale).pages.login;
  const p = (path: string) => localePath(locale, path);
  return (
    <div className="wrap grid min-h-[70vh] place-items-center py-12">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <p className="section-eyebrow">{t.eyebrow}</p>
        <h1 className="mt-2 text-4xl">{t.heading}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t.description}</p>
        {hata && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            {hata === 'dogrulama'
              ? t.notVerified
              : (t.errors[hata as keyof typeof t.errors] ?? t.error)}
            {hata === 'dogrulama' && (
              <>
                {' '}
                <a href={p('/dogrula')} className="font-semibold underline">
                  {t.resendVerification}
                </a>
              </>
            )}
          </p>
        )}
        <div className="mt-7 grid gap-3">
          <GoogleButton
            href={`/api/auth/google?next=${encodeURIComponent(safeNext(next ?? '', p('/')))}`}
            label={t.google}
            loadingLabel={t.googleLoading}
          />
          <p className="auth-divider">
            <span>{t.or}</span>
          </p>
        </div>
        <form action={loginAction} className="mt-4 grid gap-5">
          <input type="hidden" name="next" value={safeNext(next ?? '', p('/'))} />
          <label className="grid gap-2 text-sm font-semibold">
            {t.email}
            <Input name="email" type="text" inputMode="email" autoComplete="username" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.password}
            <Input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Button type="submit">{t.submit}</Button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
          <a href={p('/sifremi-unuttum')} className="font-semibold text-[var(--accent-strong)]">
            {t.forgotLink}
          </a>
          <a href={p('/kayit')} className="font-semibold text-[var(--accent-strong)]">
            {t.registerLink}
          </a>
        </div>
      </Card>
    </div>
  );
}
