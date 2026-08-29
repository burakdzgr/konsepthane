import { NextResponse, type NextRequest } from 'next/server';
import { localeFromPath, localePath } from '@/lib/i18n';
import {
  OAUTH_COOKIE,
  WEB_ORIGIN,
  OAUTH_COOKIE_MAX_AGE,
  buildAuthorizationUrl,
  googleConfigured,
  randomToken,
  safeReturnTo,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * Step 1 of "Google ile devam et": mint state + nonce + PKCE verifier, remember them in a short
 * httpOnly cookie together with the return path, and send the browser to Google.
 * GET /api/auth/google?next=/tr/kaydedilenler
 */
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next');
  const locale = localeFromPath(next ?? '/tr');
  const returnTo = safeReturnTo(next, localePath(locale, '/'));
  const loginPage = localePath(locale, '/giris');
  if (!googleConfigured())
    return NextResponse.redirect(new URL(`${loginPage}?hata=google-kapali`, WEB_ORIGIN));
  const tx = {
    state: randomToken(),
    nonce: randomToken(),
    verifier: randomToken(48),
    returnTo,
    locale,
  };
  const response = NextResponse.redirect(buildAuthorizationUrl(tx), { status: 302 });
  response.cookies.set(OAUTH_COOKIE, JSON.stringify(tx), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google',
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return response;
}
