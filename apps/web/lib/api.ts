import type {
  CategorySummary,
  ConceptDetail,
  ConceptSort,
  ConceptSummary,
  Paginated,
} from '@ilham/shared-types';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const fallbackCategories: CategorySummary[] = [
  {
    id: 'fallback-birthday',
    name: 'Doğum Günü',
    slug: 'dogum-gunu',
    description: 'Her yaş için tema, süsleme ve planlama fikirleri.',
    status: 'PUBLISHED',
    conceptCount: 1,
  },
  {
    id: 'fallback-baby',
    name: 'Baby Shower',
    slug: 'baby-shower',
    description: 'Bebeği karşılamaya hazırlanırken zarif ve uygulanabilir fikirler.',
    status: 'PUBLISHED',
    conceptCount: 0,
  },
  {
    id: 'fallback-engagement',
    name: 'Nişan',
    slug: 'nisan',
    description: 'Nişan masası, dekorasyon ve davet ilhamı.',
    status: 'PUBLISHED',
    conceptCount: 0,
  },
  {
    id: 'fallback-henna',
    name: 'Kına',
    slug: 'kina',
    description: 'Modern ve geleneksel kına gecesi planları.',
    status: 'PUBLISHED',
    conceptCount: 0,
  },
];

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}/v1${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCategories() {
  return (await fetchApi<Paginated<CategorySummary>>('/categories'))?.data ?? fallbackCategories;
}
export type ConceptQuery = {
  sort?: ConceptSort | undefined;
  category?: string | undefined;
  q?: string | undefined;
  pageSize?: number | undefined;
  page?: number | undefined;
};

/** Concepts with pagination metadata; used by hub pages that render page links. */
export async function getConceptsPage(query: ConceptQuery = {}) {
  const params = new URLSearchParams();
  if (query.sort) params.set('sort', query.sort);
  if (query.category) params.set('category', query.category);
  if (query.q) params.set('q', query.q);
  params.set('pageSize', String(query.pageSize ?? 24));
  params.set('page', String(query.page ?? 1));
  const result = await fetchApi<Paginated<ConceptSummary>>(`/concepts?${params.toString()}`);
  if (result) return result;
  // API unreachable: an honest empty page, never fabricated content.
  return {
    data: [],
    meta: { page: 1, pageSize: query.pageSize ?? 24, total: 0, pageCount: 1 },
  } satisfies Paginated<ConceptSummary>;
}

export async function getConcepts(query: ConceptQuery = {}) {
  const params = new URLSearchParams();
  if (query.sort) params.set('sort', query.sort);
  if (query.category) params.set('category', query.category);
  if (query.q) params.set('q', query.q);
  params.set('pageSize', String(query.pageSize ?? 30));
  const result = await fetchApi<Paginated<ConceptSummary>>(`/concepts?${params.toString()}`);
  return result?.data ?? [];
}
export async function getCategory(slug: string) {
  const item = await fetchApi<CategorySummary & { concepts: ConceptSummary[] }>(
    `/categories/${encodeURIComponent(slug)}`,
  );
  if (item) return item;
  const category = fallbackCategories.find((candidate) => candidate.slug === slug);
  if (!category) return null;
  return { ...category, concepts: [] };
}
export async function getConcept(slug: string) {
  return fetchApi<ConceptDetail>(`/concepts/${encodeURIComponent(slug)}`);
}
