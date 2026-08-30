/**
 * Content-Security-Policy for the public site (applied per request in `proxy.ts`).
 *
 * Nonce + `strict-dynamic`: every script Next.js emits carries the request nonce (Next reads it
 * from the CSP request header); scripts those trusted scripts create at runtime — Cookiebot's
 * `uc.js`, the GA4 tag loaded after statistics consent — are allowed transitively, so no host
 * allowlist is needed for scripts. `https:`/`'unsafe-inline'` are fallbacks for browsers without
 * `strict-dynamic` support and are ignored by modern ones.
 *
 * Runtime toggles:
 * - `CSP_REPORT_ONLY=1` → sends `Content-Security-Policy-Report-Only` instead (observe, never block).
 * - development → adds `'unsafe-eval'` and websocket connects for Turbopack HMR.
 * Violations are posted to `/api/csp-report` (logged by the web container).
 */
const isDev = process.env.NODE_ENV !== 'production';

function origin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const mediaOrigin = origin(process.env.NEXT_PUBLIC_MEDIA_URL);
const webOrigin = origin(process.env.WEB_URL);

const COOKIEBOT = ['https://consent.cookiebot.com', 'https://consentcdn.cookiebot.com'];
// GA4 endpoints incl. the Google-signals/consent pings gtag sends to google.com / doubleclick
// once marketing consent exists (https://developers.google.com/tag-platform/security/guides/csp).
const GOOGLE_ANALYTICS = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
  'https://*.google.com',
  'https://*.google.com.tr',
  'https://*.g.doubleclick.net',
];

export function buildCsp(nonce: string) {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      'https:',
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      ...(mediaOrigin ? [mediaOrigin] : []),
      ...(webOrigin ? [webOrigin] : []),
      'https://*.googleusercontent.com', // Google sign-in avatars
      'https://imgsct.cookiebot.com',
      ...COOKIEBOT,
      ...GOOGLE_ANALYTICS,
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      ...(mediaOrigin ? [mediaOrigin] : []),
      ...COOKIEBOT,
      ...GOOGLE_ANALYTICS,
      ...(isDev ? ['ws:', 'wss:'] : []),
    ],
    'frame-src': [...COOKIEBOT],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'report-uri': ['/api/csp-report'],
  };
  // Only meaningful (and only safe) when the site itself is served over HTTPS.
  if (webOrigin?.startsWith('https:')) directives['upgrade-insecure-requests'] = [];
  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

export const cspHeaderName =
  process.env.CSP_REPORT_ONLY === '1'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

/** 128-bit random nonce, base64 (what browsers expect after `nonce-`). */
export function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
