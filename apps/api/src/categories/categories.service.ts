import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, type Prisma } from '@ilham/database';
import { DatabaseService } from '../common/database.module';
import { SeoService } from '../seo/seo.service';
import type { CreateCategoryDto, ListQueryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly seo: SeoService,
  ) {}
  async listPublic(page = 1, pageSize = 20) {
    const where = { status: ContentStatus.PUBLISHED };
    const [data, total] = await this.db.$transaction([
      this.db.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { concepts: { where } } } },
      }),
      this.db.category.count({ where }),
    ]);
    return {
      data: data.map(({ _count, ...item }) => ({ ...item, conceptCount: _count.concepts })),
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
    };
  }
  async getPublic(slug: string) {
    const category = await this.db.category.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
      include: {
        concepts: { where: { status: ContentStatus.PUBLISHED }, orderBy: { publishedAt: 'desc' } },
      },
    });
    if (!category) throw new NotFoundException('Kategori bulunamadı.');
    return category;
  }
  async listAdmin(query: ListQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await this.db.$transaction([
      this.db.category.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.category.count({ where }),
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
  async create(input: CreateCategoryDto) {
    if (await this.db.category.findUnique({ where: { slug: input.slug } }))
      throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    const data: Prisma.CategoryUncheckedCreateInput = {
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      status: input.status ?? ContentStatus.DRAFT,
      sortOrder: input.sortOrder ?? 0,
      ...(input.status === ContentStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
    };
    return this.db.category.create({ data });
  }
  async update(id: string, input: UpdateCategoryDto) {
    const current = await this.db.category.findUnique({
      where: { id },
      select: { slug: true, status: true },
    });
    if (!current) throw new NotFoundException('Kategori bulunamadı.');
    if (input.slug && input.slug !== current.slug) {
      if (await this.db.category.findUnique({ where: { slug: input.slug } }))
        throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    }
    return this.db.$transaction(async (tx) => {
      if (input.slug && input.slug !== current.slug && current.status === ContentStatus.PUBLISHED)
        await this.seo.recordSlugChange(tx, 'CATEGORY', id, current.slug, input.slug);
      return tx.category.update({
        where: { id },
        data: {
          ...input,
          version: { increment: 1 },
          ...(input.status === ContentStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
        },
      });
    });
  }
  async remove(id: string) {
    await this.ensureExists(id);
    const count = await this.db.concept.count({ where: { categoryId: id } });
    if (count > 0) throw new ConflictException('İçerik barındıran kategori silinemez; arşivleyin.');
    return this.db.category.delete({ where: { id } });
  }
  private async ensureExists(id: string) {
    if (!(await this.db.category.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException('Kategori bulunamadı.');
  }
}
