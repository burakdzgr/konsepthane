import type { CommunityProfile } from './community';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  postCount: number;
};
export type BlogTag = { slug: string; tag: string; count: number };
export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  tags: string[];
  featured: boolean;
  readingMinutes: number;
  viewCount: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; profile: CommunityProfile | null } | null;
};
export type BlogPost = BlogPostSummary & {
  body: string;
  indexability: string;
  seoTitle: string | null;
  seoDescription: string | null;
  related: BlogPostSummary[];
};
export type BlogPage = {
  data: BlogPostSummary[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};

export const BLOG_PAGE_SIZE = 12;

/** Public blog endpoints; a failed request degrades to the fallback (never fabricated content). */
async function blogApi<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const response = await fetch(`${apiUrl}/v1/blog${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

const emptyPage: BlogPage = {
  data: [],
  meta: { page: 1, pageSize: BLOG_PAGE_SIZE, total: 0, pageCount: 1 },
};

export function getBlogPosts(
  input: {
    page?: number;
    pageSize?: number;
    category?: string;
    tag?: string;
    q?: string;
    featured?: boolean;
  } = {},
) {
  const query = new URLSearchParams({
    page: String(input.page ?? 1),
    pageSize: String(input.pageSize ?? BLOG_PAGE_SIZE),
    ...(input.category ? { category: input.category } : {}),
    ...(input.tag ? { tag: input.tag } : {}),
    ...(input.q ? { q: input.q } : {}),
    ...(input.featured ? { featured: '1' } : {}),
  });
  return blogApi<BlogPage>(`/posts?${query}`, emptyPage);
}

export async function getLatestBlogPosts(count = 3) {
  return (await getBlogPosts({ pageSize: count })).data;
}

export function getBlogPost(slug: string) {
  return blogApi<BlogPost | null>(`/posts/${encodeURIComponent(slug)}`, null);
}

export function getBlogCategories() {
  return blogApi<BlogCategory[]>('/categories', []);
}

export function getBlogTags() {
  return blogApi<BlogTag[]>('/tags', []);
}

/** URL slug for a tag; mirrors the API's `tagSlug` so links resolve to the same posts. */
export function blogTagSlug(tag: string) {
  return tag
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatBlogDate(value: string | null | undefined, locale: string) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
