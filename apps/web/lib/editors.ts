import type { CommunityAuthor, EditorProfile, EditorSummary } from '@ilham/shared-types';
import { localePath, type Locale } from './locales';

const apiUrl =
  process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}/v1${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** Active, public editors (for the sitemap, static params and "editors" listings). */
export async function getEditors() {
  return (await get<EditorSummary[]>('/editors')) ?? [];
}

export async function getEditor(username: string) {
  return get<EditorProfile>(`/editors/${encodeURIComponent(username)}`);
}

/** A public editorial author: editor profile that is active and public. */
export type EditorAuthor = CommunityAuthor & { kind: 'EDITOR'; username: string };
export function isEditorAuthor(
  author: CommunityAuthor | null | undefined,
): author is EditorAuthor {
  return Boolean(
    author &&
      author.kind === 'EDITOR' &&
      author.editorActive !== false &&
      author.isPublic !== false &&
      author.username,
  );
}

/** Where an author name should link: editors to their public page, members to their member page. */
export function authorHref(locale: Locale, author: CommunityAuthor | null | undefined) {
  if (!author?.username) return null;
  if (isEditorAuthor(author)) return localePath(locale, `/editor/${author.username}`);
  if (author.isPublic === false) return null;
  return localePath(locale, `/uye/${author.username}`);
}

/** Words-per-minute reading time for editorial bodies (Turkish prose ≈ 200 wpm). */
export function readingMinutes(...texts: Array<string | null | undefined>) {
  const words = texts
    .filter((text): text is string => Boolean(text))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
