import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@ilham/seo';
import { landingPages } from '@/content/landing-pages';
import { topicIndexDecision } from '@/lib/hub-index';
import { localePath } from '@/lib/i18n';

/**
 * Sitemaps are sharded by page family (`/sitemap/<family>.xml`) so each file stays small and a
 * change in one family does not force crawlers to re-read the others. `robots.txt` lists every
 * shard. Only the indexable locale (`tr`) is emitted.
 *
 * The sitemap never falls back to placeholder data: if the API is unreachable, a family returns only
 * what it could verify (static pages still list), so unpublished or placeholder URLs can not leak.
 */
export const sitemapFamilies = [
  'sayfalar',
  'kategoriler',
  'konseptler',
  'rehberler',
  'blog',
  'deneyimler',
  'sorular',
  'tartismalar',
  'konular',
  'koleksiyonlar',
  'editorler',
] as const;
type Family = (typeof sitemapFamilies)[number];

// Editorial constants for static pages; change a value only when that page's content changes.
const staticPages: Array<[path: string, lastModified: string]> = [
  ['/', '2026-08-28T00:00:00+03:00'],
  ['/fikirler', '2026-08-28T00:00:00+03:00'],
  ['/deneyimler', '2026-08-28T00:00:00+03:00'],
  ['/sorular', '2026-08-28T00:00:00+03:00'],
  ['/tartismalar', '2026-08-28T00:00:00+03:00'],
  ['/konu', '2026-08-28T00:00:00+03:00'],
  ['/editoryal-standartlar', '2026-08-28T00:00:00+03:00'],
  ['/topluluk-kurallari', '2026-08-28T00:00:00+03:00'],
  ['/hakkimizda', '2026-08-28T00:00:00+03:00'],
  ['/iletisim', '2026-08-28T00:00:00+03:00'],
  ['/gizlilik', '2026-08-28T00:00:00+03:00'],
  ['/kvkk-aydinlatma', '2026-08-29T00:00:00+03:00'],
  ['/cerez-politikasi', '2026-08-29T00:00:00+03:00'],
  ['/kullanim-kosullari', '2026-08-28T00:00:00+03:00'],
];

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const PAGE_SIZE = 50;
const MAX_URLS_PER_FAMILY = 5000;

type Page<T> = { data: T[]; meta?: { total?: number; pageCount?: number } };

/** Walks every page of a list endpoint. Returns `[]` (never placeholder data) when the API is down. */
async function fetchAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; items.length < MAX_URLS_PER_FAMILY; page += 1) {
    const query = new URLSearchParams({
      ...params,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    try {
      const response = await fetch(`${apiUrl}/v1${path}?${query}`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) break;
      const raw = (await response.json()) as Page<T> | T[];
      // Some list endpoints (topics) return a bare array instead of `{ data, meta }`.
      const body: Page<T> = Array.isArray(raw) ? { data: raw } : raw;
      items.push(...body.data);
      const total = body.meta?.total;
      const pageCount = body.meta?.pageCount ?? (total ? Math.ceil(total / PAGE_SIZE) : 1);
      if (body.data.length < PAGE_SIZE || page >= pageCount) break;
    } catch {
      break;
    }
  }
  return items;
}

const url = (path: string) => absoluteUrl(localePath('tr', path));

type Stamped = { slug: string; updatedAt?: string | null };

function entries<T extends Stamped>(
  items: T[],
  prefix: string,
  keep: (item: T) => boolean = () => true,
): MetadataRoute.Sitemap {
  return items.filter(keep).map((item) => ({
    url: url(`${prefix}/${item.slug}`),
    ...(item.updatedAt ? { lastModified: item.updatedAt } : {}),
  }));
}

export function generateSitemaps() {
  return sitemapFamilies.map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  /** Next 16 passes the shard id as a promise. */
  id: Promise<Family> | Family;
}): Promise<MetadataRoute.Sitemap> {
  const family = await id;
  switch (family) {
    case 'sayfalar':
      return staticPages.map(([path, lastModified]) => ({ url: url(path), lastModified }));
    case 'kategoriler': {
      const categories = await fetchAll<Stamped & { status: string }>('/categories');
      const published = new Set(
        categories.filter((item) => item.status === 'PUBLISHED').map((item) => item.slug),
      );
      // Curated landing pages ride with their category; the page itself still applies the hub
      // policy, so a thin entry is `noindex` on the page and excluded here as well.
      const topics = await fetchAll<{
        slug: string;
        contentCounts?: Record<string, number>;
        description?: string | null;
        featured: boolean;
        contentCount: number;
      }>('/community/topics');
      const landing = landingPages
        .filter((entry) => entry.locales.tr && published.has(entry.category))
        .flatMap((entry) => {
          const topic = topics.find((item) => item.slug === entry.topic);
          return topic && topicIndexDecision(topic).indexable
            ? [{ url: url(`/kategori/${entry.category}/${entry.topic}`) }]
            : [];
        });
      return [...entries(categories, '/kategori', (item) => published.has(item.slug)), ...landing];
    }
    case 'konseptler':
      return entries(
        await fetchAll<Stamped & { status: string }>('/concepts'),
        '/konsept',
        (item) => item.status === 'PUBLISHED',
      );
    case 'rehberler': {
      const feed = await fetchAll<{ type: string; slug: string; updatedAt?: string | null }>(
        '/community/feed',
        { tab: 'new' },
      );
      return entries(
        feed.filter((item) => item.type === 'GUIDE'),
        '/rehber',
      );
    }
    case 'blog': {
      // Hub + categories that have public posts + indexable posts (scheduled ones are not public yet).
      const [posts, categories] = await Promise.all([
        fetchAll<Stamped & { indexability: string }>('/blog/posts'),
        fetchAll<{ slug: string; postCount: number }>('/blog/categories'),
      ]);
      return [
        { url: url('/blog') },
        ...categories
          .filter((category) => category.postCount > 0)
          .map((category) => ({ url: url(`/blog/kategori/${category.slug}`) })),
        ...entries(posts, '/blog', (item) => item.indexability === 'INDEX'),
      ];
    }
    case 'deneyimler':
      return entries(
        await fetchAll<Stamped & { indexability: string }>('/community/experiences'),
        '/deneyim',
        (item) => item.indexability === 'INDEX',
      );
    case 'sorular':
      return entries(
        await fetchAll<Stamped & { indexability: string }>('/community/questions', { tab: 'new' }),
        '/soru',
        (item) => item.indexability === 'INDEX',
      );
    case 'tartismalar':
      return entries(
        await fetchAll<Stamped & { indexability: string }>('/community/discussions'),
        '/tartisma',
        (item) => item.indexability === 'INDEX',
      );
    case 'konular':
      return entries(
        await fetchAll<
          Stamped & {
            contentCount: number;
            contentCounts?: Record<string, number>;
            description?: string | null;
            featured: boolean;
          }
        >('/community/topics'),
        '/konu',
        (item) => topicIndexDecision(item).indexable,
      );
    case 'editorler': {
      // Only active, public editors are served by the API; members never enter a sitemap.
      const editors = await fetchAll<{ username: string | null; updatedAt?: string | null }>(
        '/editors',
      );
      return editors.flatMap((editor) =>
        editor.username
          ? [
              {
                url: url(`/editor/${editor.username}`),
                ...(editor.updatedAt ? { lastModified: editor.updatedAt } : {}),
              },
            ]
          : [],
      );
    }
    case 'koleksiyonlar':
      return entries(
        await fetchAll<Stamped & { itemCount: number; description?: string | null }>(
          '/community/collections/public',
        ),
        '/koleksiyon',
        (item) => item.itemCount >= 3 && (item.description?.trim().length ?? 0) >= 60,
      );
    default:
      return [];
  }
}
