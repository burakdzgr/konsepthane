import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce, cspHeaderName } from '@/lib/csp';

const ACCESS_COOKIE = 'ilham_member_access';
const REFRESH_COOKIE = 'ilham_member_refresh';
const LOCALE_COOKIE = 'ilham_locale';
const LOCALES = ['tr', 'en'] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'tr';
const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const secure = process.env.NODE_ENV === 'production';

function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

/**
 * Preferred locale for an unprefixed (legacy) path: the visitor's explicit choice (cookie set by
 * the language switcher), otherwise the default. Browser language / IP are deliberately not used:
 * a search engine or a shared link must always land on the same, stable URL.
 */
function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
}

/**
 * 1. Locale routing: every public URL lives under `/tr/...` or `/en/...`. Unprefixed paths are
 *    redirected permanently (old `/konsept/x` links keep working). The resolved locale travels to
 *    Server Components via the `x-locale` header, the path via `x-pathname`.
 * 2. Silent member session refresh (Server Components cannot write cookies).
 * 3. Per-request CSP nonce: sent to the browser in the CSP header and to Next (request header)
 *    so its inline/bootstrap scripts carry the nonce; `x-nonce` lets our own inline script use it.
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split('/')[1];
  if (!isLocale(first)) {
    const locale = detectLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }
  const locale = first;
  const nonce = createNonce();
  const csp = buildCsp(nonce);
  const headers = new Headers(request.headers);
  headers.set('x-locale', locale);
  headers.set('x-pathname', pathname);
  headers.set('x-nonce', nonce);
  // Next.js reads the nonce for its own <script> tags from this request header.
  headers.set('content-security-policy', csp);

  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let rotated: { accessToken: string; refreshToken: string } | null = null;
  let refreshFailed = false;
  if (!hasAccess && refreshToken) {
    try {
      const response = await fetch(`${apiUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok)
        rotated = (await response.json()) as { accessToken: string; refreshToken: string };
      else refreshFailed = true;
    } catch {
      // Keep rendering as a visitor; the next request retries the refresh.
    }
  }
  if (rotated) {
    const forwarded = request.cookies
      .getAll()
      .filter((cookie) => cookie.name !== ACCESS_COOKIE && cookie.name !== REFRESH_COOKIE)
      .map((cookie) => `${cookie.name}=${cookie.value}`);
    forwarded.push(`${ACCESS_COOKIE}=${rotated.accessToken}`);
    forwarded.push(`${REFRESH_COOKIE}=${rotated.refreshToken}`);
    headers.set('cookie', forwarded.join('; '));
  }
  const next = NextResponse.next({ request: { headers } });
  next.headers.set(cspHeaderName, csp);
  next.cookies.set(LOCALE_COOKIE, locale, {
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  });
  if (rotated) {
    next.cookies.set(ACCESS_COOKIE, rotated.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 15 * 60,
    });
    next.cookies.set(REFRESH_COOKIE, rotated.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
  }
  if (refreshFailed) next.cookies.delete(REFRESH_COOKIE);
  return next;
}

export const config = {
  matcher: [
    '/((?!_next/|api/|media/|placeholders/|brand/|\\.well-known/|favicon|robots.txt|sitemap|opengraph-image|twitter-image|icon|apple-icon|manifest|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|json|webmanifest|woff2?)$).*)',
  ],
};
