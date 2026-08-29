import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

const apiUrl = process.env.INTERNAL_API_URL ?? process.env.API_URL ?? 'http://localhost:4000';
const secure = process.env.NODE_ENV === 'production';
const ACCESS_COOKIE = secure ? '__Host-konsepthane_admin_access' : 'konsepthane_admin_access';
const REFRESH_COOKIE = secure ? '__Host-konsepthane_admin_refresh' : 'konsepthane_admin_refresh';

function securedResponse(request: NextRequest, cookieHeader?: string) {
  const nonce = Buffer.from(randomUUID()).toString('base64');
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${secure ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: http: https:",
    "font-src 'self' data:",
    `connect-src 'self'${secure ? '' : ' ws: wss:'}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(secure ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', policy);
  if (cookieHeader) headers.set('cookie', cookieHeader);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (secure)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  return response;
}

/** Rotates an expired admin access cookie before rendering so long editing sessions do not break. */
export default async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (request.cookies.has(ACCESS_COOKIE) || !refreshToken) return securedResponse(request);
  try {
    const response = await fetch(`${apiUrl}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      const failed = securedResponse(request);
      failed.cookies.delete(REFRESH_COOKIE);
      return failed;
    }
    const result = (await response.json()) as { accessToken: string; refreshToken: string };
    const forwarded = request.cookies
      .getAll()
      .filter((cookie) => cookie.name !== ACCESS_COOKIE && cookie.name !== REFRESH_COOKIE)
      .map((cookie) => `${cookie.name}=${cookie.value}`);
    forwarded.push(`${ACCESS_COOKIE}=${result.accessToken}`);
    forwarded.push(`${REFRESH_COOKIE}=${result.refreshToken}`);
    const next = securedResponse(request, forwarded.join('; '));
    next.cookies.set(ACCESS_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure,
      path: '/',
      maxAge: 15 * 60,
    });
    next.cookies.set(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure,
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    return next;
  } catch {
    return securedResponse(request);
  }
}

export const config = { matcher: ['/((?!_next/|favicon.ico).*)'] };
