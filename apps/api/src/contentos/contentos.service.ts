import {
  ConflictException,
  Inject,
  Injectable,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MediaRightsStatus, MediaStatus, Prisma } from '@ilham/database';
import { DatabaseService } from '../common/database.module';
import { S3StorageService } from '../media/storage.service';
import {
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BYTES,
  MEDIA_RESULT_SCHEMA_VERSION,
  RESULT_SCHEMA_VERSION,
  deriveSummary,
  isSha256Hex,
  renderPackageMarkdown,
  requestHash,
  sha256Hex,
  slugCandidates,
  validateManifest,
  validatePackage,
  type ManifestNeed,
  type PublicationPackageBody,
  type RenderedMediaRef,
} from './contentos.util';

interface PublicationRequestBody {
  package: PublicationPackageBody;
  media_manifest: { needs?: Record<string, ManifestNeed>; waived_unmet_indexes?: number[] };
}

export interface PublicationResult {
  schema_version: string;
  publication_ref: string;
  content_id: string;
  version: number;
  status: 'published';
  canonical_url: string;
  published_at: string;
}

/**
 * ContentOS Publishing API v1 receiving side.
 *
 * Ownership split per the contract: ContentOS owns the editorial content —
 * this side only maps the approved structure into the Guide family
 * (Markdown body, Turkish slug, canonical URL) and persists it atomically.
 * Nothing here rewrites, enriches or adds claims to the package.
 */
@Injectable()
export class ContentosService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(S3StorageService) private readonly storage: S3StorageService,
  ) {}

  // --- media ----------------------------------------------------------------

  async storeMedia(claimedSha: string, data: Buffer, contentType: string, headerSha?: string) {
    if (!isSha256Hex(claimedSha))
      throw new UnprocessableEntityException({
        code: 'media_sha_invalid',
        message: 'The path must carry a lowercase sha256 hex digest.',
      });
    if (!ALLOWED_MEDIA_TYPES.has(contentType))
      throw new UnprocessableEntityException({
        code: 'media_type_unsupported',
        message: 'Content-Type must be image/png, image/jpeg or image/webp.',
      });
    if (data.length === 0)
      throw new UnprocessableEntityException({
        code: 'media_empty',
        message: 'Empty media content.',
      });
    if (data.length > MAX_MEDIA_BYTES)
      throw new PayloadTooLargeException({
        code: 'media_too_large',
        message: `Media exceeds the ${MAX_MEDIA_BYTES} byte bound.`,
      });
    const actual = sha256Hex(data);
    if (actual !== claimedSha || (headerSha !== undefined && headerSha !== claimedSha))
      throw new UnprocessableEntityException({
        code: 'media_sha_mismatch',
        message: 'The uploaded bytes do not match the claimed sha256.',
      });

    // Duplicate uploads converge on the stored asset (contract requirement).
    const existing = await this.db.contentosMediaAsset.findUnique({
      where: { contentSha256: claimedSha },
      select: { id: true },
    });
    if (existing)
      return {
        schema_version: MEDIA_RESULT_SCHEMA_VERSION,
        media_ref: existing.id,
        content_sha256: claimedSha,
        status: 'stored' as const,
        replayed: true,
      };

    const stored = await this.storage.storeContentosBinary(claimedSha, data, contentType);
    try {
      const mapping = await this.db.$transaction(async (tx) => {
        const asset = await tx.mediaAsset.create({
          data: {
            storageKey: stored.key,
            bucket: stored.bucket,
            originalName: `contentos-${claimedSha.slice(0, 12)}`,
            mimeType: contentType,
            byteSize: BigInt(data.length),
            checksum: claimedSha,
            status: MediaStatus.READY,
            // Licensing arrives with the publication manifest and is applied
            // there; PENDING is the honest state until then.
            rightsStatus: MediaRightsStatus.PENDING,
          },
          select: { id: true },
        });
        return tx.contentosMediaAsset.create({
          data: { contentSha256: claimedSha, mediaAssetId: asset.id },
          select: { id: true },
        });
      });
      return {
        schema_version: MEDIA_RESULT_SCHEMA_VERSION,
        media_ref: mapping.id,
        content_sha256: claimedSha,
        status: 'stored' as const,
        replayed: false,
      };
    } catch (error) {
      // Concurrent identical upload: converge on the winner.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const winner = await this.db.contentosMediaAsset.findUnique({
          where: { contentSha256: claimedSha },
          select: { id: true },
        });
        if (winner)
          return {
            schema_version: MEDIA_RESULT_SCHEMA_VERSION,
            media_ref: winner.id,
            content_sha256: claimedSha,
            status: 'stored' as const,
            replayed: true,
          };
      }
      throw error;
    }
  }

  // --- publication ----------------------------------------------------------

  async publish(
    body: PublicationRequestBody,
    idempotencyKey: string,
  ): Promise<{ result: PublicationResult; replayed: boolean }> {
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new UnprocessableEntityException({
        code: 'invalid_package',
        message: 'An Idempotency-Key header of at most 128 characters is required.',
      });
    const packageError = validatePackage(body?.package);
    if (packageError) throw new UnprocessableEntityException(packageError);
    const manifestError = validateManifest(body?.media_manifest ?? {});
    if (manifestError) throw new UnprocessableEntityException(manifestError);

    const hash = requestHash({ package: body.package, media_manifest: body.media_manifest });
    const replay = await this.replayFor(idempotencyKey, hash);
    if (replay) return { result: replay, replayed: true };

    const media = await this.resolveManifestMedia(body.media_manifest?.needs ?? {});
    const author = await this.resolveAuthor();
    const pkg = body.package;
    const title = pkg.title_proposal!.trim();
    const markdown = renderPackageMarkdown(pkg, media.rendered);
    const summary = deriveSummary(pkg);
    const slug = await this.freeSlug(title);
    const publishedAt = new Date();
    const canonicalBase = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    try {
      const created = await this.db.$transaction(async (tx) => {
        const guide = await tx.guide.create({
          data: {
            title,
            slug,
            summary,
            body: markdown,
            status: 'PUBLISHED',
            // ContentOS packages arrive human-approved through the editorial
            // pipeline: they skip the community moderation queue exactly like
            // staff-authored guides.
            moderationStatus: 'APPROVED',
            visibility: 'PUBLIC',
            indexability: 'INDEX',
            authorId: author.id,
            createdById: author.id,
            updatedById: author.id,
            publishedAt,
          },
          select: { id: true, slug: true },
        });
        // The manifest carries the editorial licensing truth for each asset.
        for (const entry of media.assets) {
          await tx.mediaAsset.update({
            where: { id: entry.mediaAssetId },
            data: {
              ...(entry.altText ? { altText: entry.altText.slice(0, 220) } : {}),
              ...(entry.licenseNote ? { licenseInfo: entry.licenseNote.slice(0, 500) } : {}),
              ...(entry.attribution ? { attribution: entry.attribution.slice(0, 500) } : {}),
              rightsStatus: MediaRightsStatus.LICENSED,
            },
          });
        }
        const publication = await tx.contentosPublication.create({
          data: {
            idempotencyKey,
            requestHash: hash,
            workItemId: pkg.work_item_id,
            packageSchemaVersion: pkg.schema_version,
            packageHash: null,
            guideId: guide.id,
            publicationRef: `guide:${guide.id}`,
            canonicalUrl: `${canonicalBase}/rehber/${guide.slug}`,
            publishedAt,
          },
        });
        return { guide, publication };
      });
      return { result: this.toResult(created.publication, created.guide.id), replayed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // A concurrent request with the same key won the race: replay or
        // conflict, exactly as if it had arrived first.
        const replayed = await this.replayFor(idempotencyKey, hash);
        if (replayed) return { result: replayed, replayed: true };
      }
      throw error;
    }
  }

  // --- internals ------------------------------------------------------------

  private async replayFor(idempotencyKey: string, hash: string) {
    const existing = await this.db.contentosPublication.findUnique({
      where: { idempotencyKey },
    });
    if (!existing) return null;
    if (existing.requestHash !== hash)
      throw new ConflictException({
        code: 'idempotency_conflict',
        message: 'A different payload was already accepted under this Idempotency-Key.',
      });
    return this.toResult(existing, existing.guideId);
  }

  private toResult(
    publication: {
      publicationRef: string;
      canonicalUrl: string;
      publishedAt: Date;
    },
    guideId: string,
  ): PublicationResult {
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      publication_ref: publication.publicationRef,
      content_id: guideId,
      version: 1,
      status: 'published',
      canonical_url: publication.canonicalUrl,
      published_at: publication.publishedAt.toISOString(),
    };
  }

  private async resolveManifestMedia(needs: Record<string, ManifestNeed>) {
    const rendered = new Map<string, RenderedMediaRef>();
    const assets: Array<{
      mediaAssetId: string;
      altText?: string | null;
      licenseNote?: string | null;
      attribution?: string | null;
    }> = [];
    for (const [index, need] of Object.entries(needs)) {
      const mapping = await this.db.contentosMediaAsset.findUnique({
        where: { contentSha256: need.content_sha256 },
        select: { mediaAssetId: true, mediaAsset: { select: { storageKey: true } } },
      });
      if (!mapping)
        throw new UnprocessableEntityException({
          code: 'media_not_uploaded',
          message: `Manifest need ${index} references sha ${need.content_sha256} which was never uploaded.`,
        });
      rendered.set(index, {
        url: this.storage.publicUrl(mapping.mediaAsset.storageKey),
        altText: (need.alt_text ?? '').trim() || 'Görsel',
      });
      assets.push({
        mediaAssetId: mapping.mediaAssetId,
        altText: need.alt_text ?? null,
        licenseNote: need.license_note ?? null,
        attribution: need.source_attribution ?? null,
      });
    }
    return { rendered, assets };
  }

  /**
   * The public owner of ContentOS publications: a configured ACTIVE user
   * (`CONTENTOS_AUTHOR_EMAIL`). No configured author means the integration
   * is not ready — 503, never an invented identity.
   */
  private async resolveAuthor() {
    const email = process.env.CONTENTOS_AUTHOR_EMAIL?.trim().toLowerCase();
    if (!email)
      throw new ServiceUnavailableException({
        code: 'temporarily_unavailable',
        message: 'ContentOS yayın yazarı yapılandırılmadı (CONTENTOS_AUTHOR_EMAIL).',
      });
    const user = await this.db.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE')
      throw new ServiceUnavailableException({
        code: 'temporarily_unavailable',
        message: 'ContentOS yayın yazarı aktif bir kullanıcı değil.',
      });
    return user;
  }

  private async freeSlug(title: string) {
    const candidates = slugCandidates(title);
    if (candidates.length === 0)
      throw new UnprocessableEntityException({
        code: 'invalid_package',
        message: 'A usable slug could not be derived from the title.',
      });
    const taken = new Set(
      (
        await this.db.guide.findMany({
          where: { slug: { in: candidates } },
          select: { slug: true },
        })
      ).map((row) => row.slug),
    );
    const free = candidates.find((candidate) => !taken.has(candidate));
    if (!free)
      throw new UnprocessableEntityException({
        code: 'invalid_package',
        message: 'No free slug candidate remains for this title.',
      });
    return free;
  }
}
