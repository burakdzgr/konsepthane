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
  transpilePackages: ['@ilham/ui', '@ilham/seo', '@ilham/shared-types', '@ilham/validation'],
  poweredByHeader: false,
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
