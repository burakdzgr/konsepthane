/**
 * Pure helpers for the ContentOS publishing bridge; unit-tested without a
 * database. The wire contract lives in the ContentOS repository as
 * `docs/PUBLISHING_API_CONTRACT.md` (accepted v1): the package body is the
 * approved editorial STRUCTURE and this side may only do mechanical
 * block-to-Markdown mapping — never rewrite, enrich or add claims.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { blogSlugify } from '../blog/blog.util';

export const PACKAGE_SCHEMA_VERSION = 'publication-package/1';
export const BODY_SCHEMA_VERSION = 'writer-draft-body/1';
export const RESULT_SCHEMA_VERSION = 'publication-result/1';
export const MEDIA_RESULT_SCHEMA_VERSION = 'media-upload-result/1';
/** Mirrors the ContentOS upload bound; anything above it is 413. */
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface ManifestNeed {
  media_asset_id?: string;
  content_sha256: string;
  media_type: string;
  byte_size?: number;
  alt_text?: string | null;
  license_note?: string | null;
  source_attribution?: string | null;
  origin?: string | null;
}

export interface PublicationPackageBody {
  schema_version: string;
  work_item_id: string;
  locale: string;
  market: string;
  title_proposal: string | null;
  body_schema_version: string;
  body: { sections?: DraftSection[] };
}

interface DraftBlock {
  block_id?: string;
  kind: string;
  text: string;
  media_need_ref?: number;
  link_need_ref?: number;
}

interface DraftSection {
  key?: string;
  heading: string;
  blocks?: DraftBlock[];
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

export function sha256Hex(data: Buffer | string) {
  return createHash('sha256').update(data).digest('hex');
}

/** Constant-time comparison; length differences still return false safely. */
export function tokensEqual(presented: string, expected: string) {
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Key-order-independent request identity for idempotency comparison. */
export function requestHash(body: unknown) {
  return sha256Hex(stableStringify(body));
}

export interface PackageValidationError {
  code: 'invalid_package';
  message: string;
}

/** Bounded structural validation; returns an error instead of throwing. */
export function validatePackage(input: unknown): PackageValidationError | null {
  const fail = (message: string): PackageValidationError => ({
    code: 'invalid_package',
    message,
  });
  if (typeof input !== 'object' || input === null) return fail('package must be an object');
  const pkg = input as Partial<PublicationPackageBody>;
  if (pkg.schema_version !== PACKAGE_SCHEMA_VERSION)
    return fail(`package.schema_version must be ${PACKAGE_SCHEMA_VERSION}`);
  if (pkg.body_schema_version !== BODY_SCHEMA_VERSION)
    return fail(`package.body_schema_version must be ${BODY_SCHEMA_VERSION}`);
  if (typeof pkg.work_item_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(pkg.work_item_id))
    return fail('package.work_item_id must be a UUID');
  if (typeof pkg.locale !== 'string' || !pkg.locale) return fail('package.locale is required');
  if (typeof pkg.market !== 'string' || pkg.market.length !== 2)
    return fail('package.market must be a two-letter market code');
  const title = pkg.title_proposal;
  if (typeof title !== 'string' || !title.trim())
    return fail('package.title_proposal is required to publish');
  if (title.trim().length > 180) return fail('package.title_proposal exceeds 180 characters');
  const sections = (pkg.body as { sections?: unknown } | undefined)?.sections;
  if (!Array.isArray(sections) || sections.length === 0)
    return fail('package.body.sections must be a non-empty array');
  for (const section of sections as DraftSection[]) {
    if (typeof section?.heading !== 'string' || !section.heading.trim())
      return fail('every body section requires a heading');
    if (!Array.isArray(section.blocks)) return fail('every body section requires blocks');
    for (const block of section.blocks) {
      if (typeof block?.kind !== 'string' || typeof block?.text !== 'string')
        return fail('every block requires kind and text');
    }
  }
  return null;
}

export function validateManifest(input: unknown): PackageValidationError | null {
  if (typeof input !== 'object' || input === null)
    return { code: 'invalid_package', message: 'media_manifest must be an object' };
  const manifest = input as {
    needs?: Record<string, ManifestNeed>;
    waived_unmet_indexes?: unknown;
  };
  for (const [index, need] of Object.entries(manifest.needs ?? {})) {
    if (!isSha256Hex(need?.content_sha256))
      return {
        code: 'invalid_package',
        message: `media_manifest.needs["${index}"].content_sha256 must be a sha256 hex digest`,
      };
    if (typeof need.media_type !== 'string' || !need.media_type)
      return {
        code: 'invalid_package',
        message: `media_manifest.needs["${index}"].media_type is required`,
      };
  }
  return null;
}

const MAX_SLUG_ATTEMPTS = 50;

export function slugCandidates(title: string): string[] {
  const base = blogSlugify(title).slice(0, 180);
  if (!base) return [];
  const candidates = [base];
  for (let suffix = 2; suffix <= MAX_SLUG_ATTEMPTS; suffix += 1)
    candidates.push(`${base}-${suffix}`);
  return candidates;
}

/** First paragraph, mechanically clipped to the Guide summary bound (320). */
export function deriveSummary(pkg: PublicationPackageBody): string {
  for (const section of pkg.body.sections ?? []) {
    for (const block of section.blocks ?? []) {
      if (block.kind === 'paragraph' && block.text.trim()) return block.text.trim().slice(0, 320);
    }
  }
  return (pkg.title_proposal ?? '').trim().slice(0, 320);
}

export interface RenderedMediaRef {
  url: string;
  altText: string;
}

/**
 * Deterministic block-to-Markdown mapping. Formatting only — the text is the
 * approved editorial text verbatim:
 * - section heading  -> `## heading`
 * - paragraph        -> the text
 * - list             -> each line prefixed `- `
 * - how_to_step      -> sequentially numbered within the section
 * - callout          -> `> ` blockquote per line
 * - faq_item         -> the text (no invented labels)
 * - media_need       -> the BOUND image (`![alt](url)`), else skipped: a
 *                       waived placeholder is a need marker, not prose
 * - internal_link_need -> skipped (placeholder; no link exists yet)
 */
export function renderPackageMarkdown(
  pkg: PublicationPackageBody,
  mediaByNeedIndex: ReadonlyMap<string, RenderedMediaRef>,
): string {
  const parts: string[] = [];
  for (const section of pkg.body.sections ?? []) {
    parts.push(`## ${section.heading.trim()}`);
    let stepNumber = 0;
    for (const block of section.blocks ?? []) {
      const text = block.text.trim();
      switch (block.kind) {
        case 'paragraph':
        case 'faq_item':
          if (text) parts.push(text);
          break;
        case 'list':
          if (text)
            parts.push(
              text
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => `- ${line}`)
                .join('\n'),
            );
          break;
        case 'how_to_step':
          if (text) {
            stepNumber += 1;
            parts.push(`${stepNumber}. ${text}`);
          }
          break;
        case 'callout':
          if (text)
            parts.push(
              text
                .split('\n')
                .map((line) => `> ${line.trim()}`)
                .join('\n'),
            );
          break;
        case 'media_need': {
          const bound =
            block.media_need_ref !== undefined
              ? mediaByNeedIndex.get(String(block.media_need_ref))
              : undefined;
          if (bound) parts.push(`![${bound.altText.replace(/[[\]]/g, '')}](${bound.url})`);
          break;
        }
        case 'internal_link_need':
          break; // placeholder: no link exists yet, the note text is not prose
        default:
          if (text) parts.push(text); // unknown future kinds degrade to prose
      }
    }
  }
  return parts.join('\n\n');
}
