import type { NextConfig } from 'next';

const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL ?? 'http://localhost:9000/ilham-media';
const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';

/** `remotePatterns` entry for an absolute URL (media bucket, CDN, the site itself). */
function remotePattern(url: string) {
  const parsed = new URL(url);
  return {
    protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
    hostname: parsed.hostname,
    ...(parsed.port ? { port: parsed.port } : {}),
    pathname: '/**',
  };
}

const config: NextConfig = {
  transpilePackages: [
    '@ilham/content',
    '@ilham/ui',
    '@ilham/seo',
    '@ilham/shared-types',
    '@ilham/validation',
  ],
  poweredByHeader: false,
  // Dev only: lets the dev server be reached as konsepthane.net (Cookiebot serves the dialog only
  // for the registered domain), e.g. via a browser-level host mapping. Ignored by `next start`.
  allowedDevOrigins: ['konsepthane.net'],
  // `globalNotFound`: branded 404 (app/global-not-found.tsx) for URLs outside the [locale] tree.
  experimental: { optimizePackageImports: ['@ilham/ui'], globalNotFound: true },
  images: {
    // Uploaded media lives in the S3/MinIO bucket; `WEB_URL` covers absolute self-links.
    remotePatterns: [remotePattern(mediaUrl), remotePattern(webUrl)],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  rewrites() {
    // Same-origin media path so image optimisation works even when the bucket host is not
    // reachable from the server (local Docker: `INTERNAL_MEDIA_URL=http://minio:9000/ilham-media`).
    const internal = process.env.INTERNAL_MEDIA_URL ?? mediaUrl;
    return [{ source: '/media/:path*', destination: `${internal.replace(/\/$/, '')}/:path*` }];
  },
  headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Browsers only honour HSTS over HTTPS, so this is inert in local development.
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Isolate the browsing context; sign-in uses redirects (no popups), so `same-origin` is safe.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        // Placeholder artwork and fonts never change without a new file name.
        source: '/placeholders/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
export default config;
