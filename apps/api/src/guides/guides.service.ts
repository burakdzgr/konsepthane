import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, type Prisma } from '@ilham/database';
import type { AccessClaims } from '../common/auth.types';
import { DatabaseService } from '../common/database.module';
import { publicAuthorSelect } from '../common/public-author';
import type { ListQueryDto } from '../categories/dto/category.dto';
import { assertCanPublish, resolveEditorialAuthor } from '../common/editorial';
import type { CreateGuideDto, UpdateGuideDto } from './guides.dto';

function slugify(value: string) {
  return value
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
    .replace(/^-+|-+$/g, '')
    .slice(0, 190);
}

/** Editorial guides: created and published by editors (`concept.write` / `concept.publish`). */
@Injectable()
export class GuidesService {
  constructor(private readonly db: DatabaseService) {}

  async listAdmin(query: ListQueryDto) {
    const where: Prisma.GuideWhereInput = query.status ? { status: query.status } : {};
    const [data, total] = await this.db.$transaction([
      this.db.guide.findMany({
        where,
        include: { author: { select: publicAuthorSelect } },
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.guide.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async create(input: CreateGuideDto, actor: AccessClaims) {
    const slug = input.slug ?? slugify(input.title);
    if (!slug) throw new BadRequestException('Kısa ad üretilemedi.');
    if (await this.db.guide.findUnique({ where: { slug } }))
      throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    const status = input.status ?? ContentStatus.DRAFT;
    assertCanPublish(status, actor);
    const authorId = await resolveEditorialAuthor(this.db, input.authorId, actor);
    return this.db.guide.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        body: input.body,
        status,
        // Editorial guides are not UGC: they skip the community moderation queue.
        moderationStatus: 'APPROVED',
        visibility: 'PUBLIC',
        indexability: input.indexability ?? 'INDEX',
        featured: input.featured ?? false,
        // Guides require an author row; a non-editor creator still owns the record, the page then
        // shows the organisation (never an invented person) as the visible author.
        authorId: authorId ?? actor.sub,
        createdById: actor.sub,
        updatedById: actor.sub,
        ...(status === ContentStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
      },
      include: { author: { select: publicAuthorSelect } },
    });
  }

  async update(id: string, input: UpdateGuideDto, actor: AccessClaims) {
    const current = await this.db.guide.findUnique({
      where: { id },
      select: { id: true, slug: true, publishedAt: true, authorId: true },
    });
    if (!current) throw new NotFoundException('Rehber bulunamadı.');
    if (input.status) assertCanPublish(input.status, actor);
    if (input.slug && input.slug !== current.slug) {
      if (await this.db.guide.findUnique({ where: { slug: input.slug } }))
        throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    }
    const authorId = input.authorId
      ? await resolveEditorialAuthor(this.db, input.authorId, actor)
      : undefined;
    return this.db.guide.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.indexability !== undefined ? { indexability: input.indexability } : {}),
        ...(input.featured !== undefined ? { featured: input.featured } : {}),
        ...(authorId ? { authorId } : {}),
        updatedById: actor.sub,
        ...(input.status === ContentStatus.PUBLISHED && !current.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
      include: { author: { select: publicAuthorSelect } },
    });
  }

  async remove(id: string, actor: AccessClaims) {
    const current = await this.db.guide.findUnique({ where: { id }, select: { status: true } });
    if (!current) throw new NotFoundException('Rehber bulunamadı.');
    if (
      current.status === ContentStatus.PUBLISHED &&
      !actor.permissions.includes('concept.publish')
    )
      throw new ForbiddenException('Yayındaki rehberi kaldırmak için yayın yetkisi gerekir.');
    return this.db.guide.delete({ where: { id } });
  }
}
