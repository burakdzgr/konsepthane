import type { Metadata } from 'next';
import { localeMetadata, type Locale } from './i18n';

export const DEFAULT_PAGE_SIZE = 24;

export type PageMeta = { page: number; pageSize: number; total: number; pageCount: number };

/** `?sayfa=` → 1-based page number; anything invalid is page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/** Normalises an API `meta` block (which may omit `pageCount`). */
export function pageMeta(
  meta: Partial<PageMeta> | undefined,
  page: number,
  pageSize: number,
): PageMeta {
  const total = meta?.total ?? 0;
  const size = meta?.pageSize ?? pageSize;
  return {
    page: meta?.page ?? page,
    pageSize: size,
    total,
    pageCount: meta?.pageCount ?? Math.max(1, Math.ceil(total / size)),
  };
}

/** Builds the same path with `sayfa` added (page 1 drops the parameter, keeping the hub canonical). */
export function pageHref(basePath: string, page: number, extra: URLSearchParams | string = '') {
  const params = new URLSearchParams(extra);
  params.delete('sayfa');
  if (page > 1) params.set('sayfa', String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Metadata for a paginated hub: page 1 keeps the hub canonical; page N is self-canonical
 * (`?sayfa=N`) with a page suffix in the title, following Google's guidance that each page in a
 * sequence is a distinct, indexable URL (no `rel=prev/next` needed).
 */
export function pagedMetadata(
  locale: Locale,
  basePath: string,
  page: number,
  input: Metadata & { indexable?: boolean },
  suffix: (page: number) => string,
  options: { filtered?: boolean } = {},
): Metadata {
  // Filtered/sorted variants (`?kategori=`, `?sekme=`, `?sirala=` …) are near-duplicates of the hub:
  // they always point their canonical at page 1 of the unfiltered list, never at `?sayfa=N`.
  if (page <= 1 || options.filtered) return localeMetadata(locale, basePath, input);
  const title = typeof input.title === 'string' ? `${input.title}${suffix(page)}` : input.title;
  return localeMetadata(locale, pageHref(basePath, page), { ...input, title });
}
