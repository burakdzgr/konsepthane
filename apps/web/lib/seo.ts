import { permanentRedirect } from 'next/navigation';
import { localePath, type Locale } from './i18n';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Editor-managed overrides stored in `seo_metadata`; attached to public entity responses. */
export type SeoOverride = {
  title: string;
  description: string;
  canonicalUrl: string | null;
  robots: 'INDEX_FOLLOW' | 'NOINDEX_FOLLOW' | 'NOINDEX_NOFOLLOW';
} | null;

/**
 * Before a detail page 404s, ask the API whether the locale-less path is a retired slug. Slug
 * changes on published entities create `slug_history` rows, so old links keep working with a
 * single 308 hop (locale is re-applied here).
 */
export async function redirectIfLegacyPath(locale: Locale, path: string): Promise<void> {
  try {
    const response = await fetch(`${apiUrl}/v1/seo/redirect?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return;
    const result = (await response.json()) as { path: string } | null;
    if (result?.path && result.path !== path) permanentRedirect(localePath(locale, result.path));
  } catch (error) {
    // `permanentRedirect` throws a control-flow error that must propagate.
    if (error && typeof error === 'object' && 'digest' in error) throw error;
  }
}

/** Merges an editor override into page metadata fields (title, description, robots). */
export function applySeoOverride(
  seo: SeoOverride | undefined,
  base: { title: string; description: string },
) {
  if (!seo) return { ...base, indexable: true as const, follow: true as const };
  return {
    title: seo.title || base.title,
    description: seo.description || base.description,
    indexable: seo.robots === 'INDEX_FOLLOW',
    follow: seo.robots !== 'NOINDEX_NOFOLLOW',
  };
}
