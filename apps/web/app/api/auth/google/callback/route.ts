import { NextResponse, type NextRequest } from 'next/server';
import { loginWithGoogleIdToken } from '@/lib/auth';
import { localePath } from '@/lib/i18n';
import {
  OAUTH_COOKIE,
  WEB_ORIGIN,
  exchangeCode,
  idTokenNonce,
  safeReturnTo,
  type OAuthTransaction,
} from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * Step 2: Google redirects back here. Validate state against the cookie, exchange the code
 * (server-side, with the client secret), bind the ID token to our nonce, hand it to the API for
 * cryptographic verification + account resolution, then store the regular member session.
 * Every failure becomes a friendly `?hata=` code on the login page — no OAuth internals leak.
 */
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(OAUTH_COOKIE)?.value;
  let tx: OAuthTransaction | null = null;
  try {
    tx = raw ? (JSON.parse(raw) as OAuthTransaction) : null;
  } catch {
    tx = null;
  }
  const locale = tx?.locale === 'en' ? 'en' : 'tr';
  const loginPage = localePath(locale, '/giris');
  const fail = (code: string) => {
    const response = NextResponse.redirect(new URL(`${loginPage}?hata=${code}`, WEB_ORIGIN));
    response.cookies.delete(OAUTH_COOKIE);
    return response;
  };

  const params = request.nextUrl.searchParams;
  if (params.get('error'))
    return fail(params.get('error') === 'access_denied' ? 'google-iptal' : 'google');
  const code = params.get('code');
  const state = params.get('state');
  if (!tx || !code || !state || state !== tx.state) return fail('google-gecersiz');

  let idToken: string;
  try {
    idToken = await exchangeCode(code, tx.verifier);
  } catch {
    return fail('google');
  }
  if (idTokenNonce(idToken) !== tx.nonce) return fail('google-gecersiz');

  try {
    await loginWithGoogleIdToken(idToken);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'GOOGLE_FAILED';
    return fail(
      code === 'ACCOUNT_DISABLED'
        ? 'hesap-kapali'
        : code === 'EMAIL_NOT_VERIFIED'
          ? 'google-dogrulanmamis'
          : 'google',
    );
  }
  const response = NextResponse.redirect(
    new URL(safeReturnTo(tx.returnTo, localePath(locale, '/')), WEB_ORIGIN),
  );
  response.cookies.delete(OAUTH_COOKIE);
  return response;
}
