import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Server-side pieces of the Google OAuth 2.0 authorization-code flow (PKCE + state + nonce).
 * The client secret lives only in the web server's environment and is used exclusively here,
 * on the server, to exchange the authorization code. Never imported by client components.
 */
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const OAUTH_COOKIE = 'kh_oauth';
export const OAUTH_COOKIE_MAX_AGE = 10 * 60;

/** Public origin of the site; redirects are built on it, never on the (proxied) request host. */
export const WEB_ORIGIN = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const webUrl = WEB_ORIGIN;
/** The one and only redirect URI this deployment uses — must match Google Cloud exactly. */
export const GOOGLE_REDIRECT_URI = `${webUrl}/api/auth/google/callback`;

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export type OAuthTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  locale: string;
};

export function buildAuthorizationUrl(tx: OAuthTransaction) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: tx.state,
    nonce: tx.nonce,
    code_challenge: pkceChallenge(tx.verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
    access_type: 'online',
    include_granted_scopes: 'false',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Exchanges the authorization code for tokens; only `id_token` is used. */
export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`token exchange failed (${response.status})`);
  const payload = (await response.json()) as { id_token?: string };
  if (!payload.id_token) throw new Error('token exchange returned no id_token');
  return payload.id_token;
}

/**
 * Reads the `nonce` claim without verifying the signature — signature/issuer/audience/expiry are
 * verified by the API; this only binds the token to the browser session that started the flow.
 */
export function idTokenNonce(idToken: string): string | null {
  const part = idToken.split('.')[1];
  if (!part) return null;
  try {
    const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { nonce?: string };
    return json.nonce ?? null;
  } catch {
    return null;
  }
}

/** Only same-site, locale-prefixed paths may be used as a post-login destination. */
export function safeReturnTo(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/^\/(api|admin)(\/|$)/.test(value)) return fallback;
  return value;
}
