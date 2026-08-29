import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@ilham/seo';
import { sitemapFamilies } from './sitemap';

/**
 * Crawl policy — one control per URL class, never two that contradict each other:
 *
 * - Private / personal / thin HTML pages (`/giris`, `/kaydedilenler`, `/bildirimler`, `/olustur`,
 *   `/uye/…`, `/anket/…`, the `/kesfet` hub) are CRAWLABLE and carry `noindex` in their own HTML.
 *   They are linked from every page (login, profile, save flows), so blocking them in robots.txt
 *   would leave Google unable to read the noindex and could surface them as "indexed, though
 *   blocked". They are never in a sitemap.
 * - Search-result URLs (`/kesfet?q=…` and facet variants) are the one deliberate robots.txt block:
 *   the query space is unbounded (any user input, any facet combination), i.e. a crawl trap, so
 *   crawl budget — not indexing — is the concern. The page also carries `noindex` as defence in
 *   depth for URLs discovered before the block, but the policy does not rely on it. Templates never
 *   emit `<a href>` links to `/kesfet?…`; search is reached through the search form (GET) only.
 * - `/admin` and `/api/` serve no indexable HTML (no place for a meta tag), so robots.txt is the
 *   only sensible control there.
 */
const searchResultPatterns = ['/*/kesfet?*'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: [...searchResultPatterns, '/admin', '/api/'] }],
    sitemap: sitemapFamilies.map((family) => absoluteUrl(`/sitemap/${family}.xml`)),
  };
}
