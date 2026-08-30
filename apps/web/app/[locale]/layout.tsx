import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { defaultDescription, siteName } from '@ilham/seo';
import { CookiebotBridge, CookiebotHead, CookieSettingsLink } from '@/components/cmp-cookiebot';
import { AuthModalHost } from '@/components/auth-modal';
import { DropdownDismiss } from '@/components/dropdown-dismiss';
import { NavigationMotion } from '@/components/navigation-motion';
import { SessionProvider } from '@/components/session/session-provider';
import { MobileNav, SiteHeader } from '@/components/site-header';
import { getDictionary, htmlLang, indexableLocales, isLocale, localePath } from '@/lib/i18n';
import '../globals.css';

const poppins = Poppins({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-poppins',
  display: 'swap',
});

/**
 * Root layout lives under `[locale]` so `<html lang>` comes from the route param instead of a
 * request header — reading headers here would make every page dynamic. The proxy guarantees
 * every public path carries a locale prefix.
 */

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fffdfb' },
    { media: '(prefers-color-scheme: dark)', color: '#201b18' },
  ],
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Every page renders per request: the strict CSP needs a fresh nonce on each response (read via
 * `headers()` below), which is incompatible with prerendered HTML. Data still benefits from the
 * fetch cache (`next: { revalidate }`) in lib/*, so the API is not hit on every request.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const base: Metadata = {
    metadataBase: new URL(process.env.WEB_URL ?? 'http://localhost:3000'),
    title: {
      default: `${siteName} — Kutlama fikirleri ve gerçek deneyimler`,
      template: `%s | ${siteName}`,
    },
    description: defaultDescription,
    applicationName: siteName,
    creator: siteName,
    publisher: siteName,
    referrer: 'origin-when-cross-origin',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32x32.png?v=4', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png?v=4', sizes: '16x16', type: 'image/png' },
      ],
      apple: '/brand/apple-touch-icon-180.png?v=2',
    },
    // The social image comes from `app/opengraph-image.tsx` (a rasterised PNG); pages with a hero
    // image override it, pages without one inherit it via `localeMetadata`.
    openGraph: { siteName, type: 'website' },
    twitter: { card: 'summary_large_image' },
  };
  if (!isLocale(locale)) return base;
  const t = getDictionary(locale);
  return {
    ...base,
    title: { default: `${t.site.name} — ${t.site.tagline}`, template: `%s | ${t.site.name}` },
    description: t.site.description,
    ...(indexableLocales.includes(locale) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);
  const footerColumns: Array<[string, Array<[string, string]>]> = [
    [
      t.nav.footer.explore,
      [
        [t.nav.birthday, p('/kategori/dogum-gunu')],
        [t.nav.babyShower, p('/kategori/baby-shower')],
        [t.nav.engagement, p('/kategori/nisan')],
        [t.nav.henna, p('/kategori/kina')],
        [t.nav.footer.allConcepts, p('/fikirler')],
        [t.nav.footer.blog, p('/blog')],
        [t.nav.footer.topics, p('/konu')],
      ],
    ],
    [
      t.nav.footer.community,
      [
        [t.nav.footer.realExperiences, p('/deneyimler')],
        [t.nav.questions, p('/sorular')],
        [t.nav.footer.shareExperience, p('/olustur?tur=deneyim')],
        [t.nav.footer.askQuestion, p('/olustur?tur=soru')],
        [t.nav.footer.discussions, p('/tartismalar')],
      ],
    ],
    [
      t.nav.footer.account,
      [
        [t.nav.login, p('/giris')],
        [t.nav.saved, p('/kaydedilenler')],
        [t.nav.notifications, p('/bildirimler')],
      ],
    ],
    [
      t.nav.footer.corporate,
      [
        [t.nav.footer.about, p('/hakkimizda')],
        [t.nav.footer.contact, p('/iletisim')],
        [t.nav.footer.editorialStandards, p('/editoryal-standartlar')],
        [t.nav.footer.rules, p('/topluluk-kurallari')],
        [t.nav.footer.privacy, p('/gizlilik')],
        [t.nav.footer.kvkk, p('/kvkk-aydinlatma')],
        [t.nav.footer.terms, p('/kullanim-kosullari')],
        [t.nav.footer.cookies, p('/cerez-politikasi')],
      ],
    ],
  ];
  const cookiebotId = process.env.NEXT_PUBLIC_COOKIEBOT_ID || undefined;
  // CSP nonce minted in proxy.ts; the consent bootstrap is our only inline script.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang={htmlLang[locale]} className={poppins.variable}>
      <head>
        <CookiebotHead
          cbid={cookiebotId}
          locale={locale}
          nonce={nonce}
          gaId={process.env.NEXT_PUBLIC_GA_ID}
        />
      </head>
      <body>
        <SessionProvider>
          <DropdownDismiss />
          <AuthModalHost
            locale={locale}
            labels={{
              ...t.pages.authModal,
              email: t.pages.login.email,
              password: t.pages.login.password,
              name: t.pages.register.name,
              passwordHint: t.pages.register.passwordHint,
              loginSubmit: t.pages.login.submit,
              registerSubmit: t.pages.register.submit,
              google: t.pages.login.google,
              googleLoading: t.pages.login.googleLoading,
              or: t.pages.login.or,
              terms: t.pages.register.terms,
              termsLink: t.nav.footer.terms,
              privacyLink: t.nav.footer.kvkk,
              forgotHeading: t.pages.forgot.heading,
              forgotText: t.pages.forgot.description,
              forgotSubmit: t.pages.forgot.submit,
              forgotSentTitle: t.pages.forgot.sentTitle,
              forgotSentText: t.pages.forgot.sentText,
              back: t.pages.forgot.back,
            }}
          />
          <CookiebotBridge cbid={cookiebotId} gaId={process.env.NEXT_PUBLIC_GA_ID} />
          <a
            href="#icerik"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
          >
            {t.site.skipToContent}
          </a>
          <SiteHeader locale={locale} />
          <main id="icerik" tabIndex={-1}>
            <NavigationMotion>{children}</NavigationMotion>
          </main>
          <MobileNav locale={locale} />
          <footer className="site-footer">
            <div className="wrap">
              <div className="footer-grid">
                <div>
                  <Link href={p('/')} className="footer-brand" aria-label="Konsepthane">
                    <img
                      src="/brand/konsepthane-logo.png?v=2"
                      alt="Konsepthane"
                      width="1901"
                      height="509"
                      decoding="async"
                    />
                  </Link>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
                    {t.site.footerBlurb}
                  </p>
                </div>
                {footerColumns.map(([title, links]) => (
                  <div key={title}>
                    <h3>{title}</h3>
                    {links.map(([label, href]) => (
                      <Link key={href} href={href}>
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
              <div className="footer-bottom">
                <p>{t.site.copyright}</p>
              </div>
            </div>
            {cookiebotId ? (
              <p className="footer-legal-row">
                <CookieSettingsLink label={t.nav.footer.cookieSettings} cbid={cookiebotId} />
              </p>
            ) : null}
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
