import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, type Prisma } from '@ilham/database';
import type { AccessClaims } from '../common/auth.types';
import { DatabaseService } from '../common/database.module';
import { assertCanPublish, resolveEditorialAuthor } from '../common/editorial';
import { publicAuthorSelect } from '../common/public-author';
import { SeoService } from '../seo/seo.service';
import type { ListQueryDto } from '../categories/dto/category.dto';
import type {
  ConceptFaqEntry,
  ConceptImageInput,
  ConceptListQueryDto,
  ConceptPaletteEntry,
  CreateConceptDto,
  UpdateConceptDto,
} from './dto/concept.dto';

const conceptOrder: Record<
  NonNullable<ConceptListQueryDto['sort']>,
  Prisma.ConceptOrderByWithRelationInput[]
> = {
  popular: [
    { featured: 'desc' },
    { experienceCount: 'desc' },
    { saveCount: 'desc' },
    { questionCount: 'desc' },
    { publishedAt: 'desc' },
  ],
  new: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  saved: [{ saveCount: 'desc' }, { reactionCount: 'desc' }, { publishedAt: 'desc' }],
};

@Injectable()
export class ConceptsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly seo: SeoService,
  ) {}
  async listPublic(query: ConceptListQueryDto) {
    const where: Prisma.ConceptWhereInput = {
      status: ContentStatus.PUBLISHED,
      visibility: 'PUBLIC',
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { summary: { contains: query.q, mode: 'insensitive' } },
              { description: { contains: query.q, mode: 'insensitive' } },
              { category: { name: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.concept.findMany({
        where,
        include: { category: true },
        orderBy: conceptOrder[query.sort ?? 'popular'],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.concept.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }
  async getPublic(slug: string) {
    const item = await this.findPublic(slug);
    if (!item) throw new NotFoundException('Konsept bulunamadı.');
    const [comments, seo] = await Promise.all([
      this.publicComments(item.id),
      this.seo.getMetadata('CONCEPT', item.id),
    ]);
    return { ...item, comments, seo };
  }
  private async findPublic(slug: string) {
    return this.db.concept.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
      include: {
        category: true,
        author: { select: publicAuthorSelect },
        images: { orderBy: { sortOrder: 'asc' } },
        experiences: {
          where: { status: 'APPROVED', visibility: 'PUBLIC' },
          include: {
            author: { select: publicAuthorSelect },
            images: { orderBy: { sortOrder: 'asc' } },
            eventType: true,
          },
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          take: 12,
        },
        questions: {
          where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' },
          include: { author: { select: publicAuthorSelect }, images: true },
          orderBy: [{ answerCount: 'desc' }, { createdAt: 'desc' }],
          take: 12,
        },
      },
    });
  }
  private publicComments(conceptId: string) {
    return this.db.comment.findMany({
      where: {
        entityType: 'INSPIRATION',
        entityId: conceptId,
        parentId: null,
        visibility: 'PUBLIC',
        moderationStatus: 'APPROVED',
      },
      include: {
        author: { select: publicAuthorSelect },
        replies: {
          where: { visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
          include: { author: { select: publicAuthorSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
  async listAdmin(query: ListQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await this.db.$transaction([
      this.db.concept.findMany({
        where,
        include: { category: true, images: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.concept.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }
  async create(input: CreateConceptDto, actor: AccessClaims) {
    if (await this.db.concept.findUnique({ where: { slug: input.slug } }))
      throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    assertCanPublish(input.status, actor);
    const authorId = await resolveEditorialAuthor(this.db, input.authorId, actor);
    const images = this.normalizeImages(input.images, input.title);
    const data: Prisma.ConceptUncheckedCreateInput = {
      categoryId: input.categoryId,
      title: input.title,
      slug: input.slug,
      summary: input.summary,
      description: input.description,
      status: input.status ?? ContentStatus.DRAFT,
      authorId,
      createdById: actor.sub,
      updatedById: actor.sub,
      heroImageUrl: input.heroImageUrl ?? images[0]?.url ?? null,
      heroImageAlt: input.heroImageAlt ?? images[0]?.altText ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      ...this.editorialData(input),
      ...(input.status === ContentStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
      ...(images.length ? { images: { create: images } } : {}),
    };
    return this.db.concept.create({
      data,
      include: { category: true, images: true },
    });
  }
  async update(id: string, input: UpdateConceptDto, actor: AccessClaims) {
    const current = await this.db.concept.findUnique({
      where: { id },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true },
    });
    if (!current) throw new NotFoundException('Konsept bulunamadı.');
    if (input.slug && input.slug !== current.slug) {
      const taken = await this.db.concept.findUnique({ where: { slug: input.slug } });
      if (taken) throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    }
    const slugChanged = Boolean(input.slug && input.slug !== current.slug);
    const wasPublic = current.status === ContentStatus.PUBLISHED;
    assertCanPublish(input.status, actor);
    const authorId = input.authorId
      ? await resolveEditorialAuthor(this.db, input.authorId, actor)
      : undefined;
    const scalars: Record<string, unknown> = { ...input };
    delete scalars.authorId;
    delete scalars.images;
    delete scalars.colorPalette;
    delete scalars.faq;
    const images = input.images;
    const nextImages = images ? this.normalizeImages(images, input.title ?? current.title) : null;
    return this.db.$transaction(async (tx) => {
      if (nextImages) {
        await tx.conceptImage.deleteMany({ where: { conceptId: id } });
        if (nextImages.length)
          await tx.conceptImage.createMany({
            data: nextImages.map((image) => ({ ...image, conceptId: id })),
          });
      }
      // A slug change on a page that was ever public leaves a permanent redirect behind.
      if (slugChanged && wasPublic && input.slug)
        await this.seo.recordSlugChange(tx, 'CONCEPT', id, current.slug, input.slug);
      return tx.concept.update({
        where: { id },
        data: {
          ...(scalars as Prisma.ConceptUncheckedUpdateInput),
          ...this.editorialData(input),
          ...(authorId ? { authorId } : {}),
          updatedById: actor.sub,
          version: { increment: 1 },
          ...(input.status === ContentStatus.PUBLISHED && !current.publishedAt
            ? { publishedAt: new Date() }
            : {}),
          ...(nextImages?.length && !input.heroImageUrl
            ? { heroImageUrl: nextImages[0]!.url, heroImageAlt: nextImages[0]!.altText }
            : {}),
        },
        include: { category: true, images: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }
  async remove(id: string, actor: AccessClaims) {
    const current = await this.db.concept.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Konsept bulunamadı.');
    if (
      current.status === ContentStatus.PUBLISHED &&
      !actor.permissions.includes('concept.publish')
    )
      throw new ForbiddenException('Yayındaki konsepti silmek için yayın yetkisi gerekir.');
    return this.db.concept.delete({ where: { id } });
  }
  private editorialData(input: Partial<CreateConceptDto>) {
    const data: { colorPalette?: Prisma.InputJsonValue; faq?: Prisma.InputJsonValue } = {};
    if (input.colorPalette !== undefined)
      data.colorPalette = this.normalizePalette(input.colorPalette);
    if (input.faq !== undefined) data.faq = this.normalizeFaq(input.faq);
    return data;
  }
  private normalizePalette(entries: ConceptPaletteEntry[] | undefined) {
    return (entries ?? [])
      .filter((entry) => entry && typeof entry.name === 'string' && typeof entry.hex === 'string')
      .map((entry) => ({ name: entry.name.trim().slice(0, 60), hex: entry.hex.trim().slice(0, 9) }))
      .filter((entry) => entry.name && /^#[0-9a-fA-F]{3,8}$/.test(entry.hex));
  }
  private normalizeFaq(entries: ConceptFaqEntry[] | undefined) {
    return (entries ?? [])
      .filter(
        (entry) => entry && typeof entry.question === 'string' && typeof entry.answer === 'string',
      )
      .map((entry) => ({
        question: entry.question.trim().slice(0, 240),
        answer: entry.answer.trim().slice(0, 2000),
      }))
      .filter((entry) => entry.question && entry.answer);
  }
  private normalizeImages(entries: ConceptImageInput[] | undefined, title: string) {
    return (entries ?? [])
      .filter((entry) => entry && typeof entry.url === 'string' && entry.url.trim())
      .slice(0, 12)
      .map((entry, sortOrder) => ({
        url: entry.url.trim().slice(0, 2048),
        altText: (typeof entry.altText === 'string' && entry.altText.trim()
          ? entry.altText.trim()
          : `${title} görseli ${sortOrder + 1}`
        ).slice(0, 220),
        sortOrder,
      }));
  }
  private async ensureExists(id: string) {
    if (!(await this.db.concept.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException('Konsept bulunamadı.');
  }
}
