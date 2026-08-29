/**
 * Uploaded media is stored with its absolute bucket/CDN URL (`MEDIA_PUBLIC_URL/<key>`). On the web
 * it is served through the same-origin `/media/<key>` path (see `next.config.ts` rewrites), so
 * `next/image` optimises it without a remote allowlist and the server can fetch it from the
 * internal bucket host inside Docker. Client-safe: no server-only imports.
 */
const publicMediaUrl = (process.env.NEXT_PUBLIC_MEDIA_URL ?? 'http://localhost:9000/ilham-media')
  .replace(/\/$/, '');

export function displayMediaSrc(src: string) {
  return src.startsWith(`${publicMediaUrl}/`) ? `/media/${src.slice(publicMediaUrl.length + 1)}` : src;
}
