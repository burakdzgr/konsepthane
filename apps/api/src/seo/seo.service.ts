import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RobotsDirective, type SeoEntityType } from '@ilham/database';
import { DatabaseService } from '../common/database.module';
import type { UpsertSeoMetadataDto } from './seo.dto';

/** Public URL path prefixes per entity, mirrored by the web app's route tree. */
const pathPrefix: Partial<Record<SeoEntityType, string>> = {
  CONCEPT: '/konsept',
  CATEGORY: '/kategori',
  EXPERIENCE: '/deneyim',
  QUESTION: '/soru',
  DISCUSSION: '/tartisma',
  GUIDE: '/rehber',
  TOPIC: '/konu',
  COLLECTION: '/koleksiyon',
};

@Injectable()
export class SeoService {
  constructor(private readonly db: DatabaseService) {}

  publicPath(entityType: SeoEntityType, slug: string) {
    const prefix = pathPrefix[entityType];
    return prefix ? `${prefix}/${slug}` : null;
  }

  /**
   * Records a permanent redirect when a published entity's slug changes. Older entries that
   * pointed at the previous path are re-pointed at the new one so chains never form.
   */
  async recordSlugChange(
    tx: Prisma.TransactionClient,
    entityType: SeoEntityType,
    entityId: string,
    oldSlug: string,
    newSlug: string,
  ) {
    const oldPath = this.publicPath(entityType, oldSlug);
    const newPath = this.publicPath(entityType, newSlug);
    if (!oldPath || !newPath || oldPath === newPath) return;
    await tx.slugHistory.updateMany({ where: { newPath: oldPath }, data: { newPath } });
    // The new path may itself have been an old path earlier (A → B → A); drop that loop.
    await tx.slugHistory.deleteMany({ where: { oldPath: newPath } });
    await tx.slugHistory.upsert({
      where: { oldPath },
      update: { newPath, entityType, entityId },
      create: { oldPath, newPath, entityType, entityId },
    });
  }

  /** Resolves a legacy (locale-less) path to its current path, or null. */
  async resolveRedirect(path: string) {
    const entry = await this.db.slugHistory.findUnique({ where: { oldPath: path } });
    return entry ? { path: entry.newPath, permanent: true } : null;
  }

  async getMetadata(entityType: SeoEntityType, entityId: string) {
    return this.db.seoMetadata.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
  }

  async upsertMetadata(entityType: SeoEntityType, entityId: string, input: UpsertSeoMetadataDto) {
    const structuredData: Prisma.InputJsonValue | typeof Prisma.JsonNull = input.structuredData
      ? (input.structuredData as Prisma.InputJsonValue)
      : Prisma.JsonNull;
    const data = {
      title: input.title,
      description: input.description,
      canonicalUrl: input.canonicalUrl ?? null,
      robots: input.robots ?? RobotsDirective.INDEX_FOLLOW,
      structuredData,
    };
    return this.db.seoMetadata.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      update: data,
      create: { entityType, entityId, ...data },
    });
  }

  async removeMetadata(entityType: SeoEntityType, entityId: string) {
    const existing = await this.getMetadata(entityType, entityId);
    if (!existing) throw new NotFoundException('SEO kaydı bulunamadı.');
    await this.db.seoMetadata.delete({ where: { id: existing.id } });
  }
}
