import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, Prisma } from '@ilham/database';
import type { AccessClaims } from '../common/auth.types';
import { DatabaseService } from '../common/database.module';
import { assertCanPublish, resolveEditorialAuthor } from '../common/editorial';
import { publicAuthorSelect } from '../common/public-author';
import type {
  BlogAdminListQueryDto,
  BlogListQueryDto,
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  UpdateBlogCategoryDto,
  UpdateBlogPostDto,
} from './blog.dto';
import {
  blogSlugify,
  normaliseTags,
  readingMinutesFor,
  resolvePublishedAt,
  tagSlug,
} from './blog.util';

const categorySelect = { id: true, name: true, slug: true } satisfies Prisma.BlogCategorySelect;

/** Card shape: everything a list needs, never the body. */
const summarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  tags: true,
  featured: true,
  indexability: true,
  readingMinutes: true,
  viewCount: true,
  publishedAt: true,
  updatedAt: true,
  createdAt: true,
  category: { select: categorySelect },
  author: { select: publicAuthorSelect },
} satisfies Prisma.BlogPostSelect;

const detailSelect = {
  ...summarySelect,
  body: true,
  seoTitle: true,
  seoDescription: true,
} satisfies Prisma.BlogPostSelect;

const adminSelect = {
  ...detailSelect,
  status: true,
  categoryId: true,
  createdBy: { select: { id: true, email: true } },
  updatedBy: { select: { id: true, email: true } },
} satisfies Prisma.BlogPostSelect;

/** Public visibility: published, and the (possibly scheduled) publish date has passed. */
function publicWhere(now = new Date()): Prisma.BlogPostWhereInput {
  return { status: ContentStatus.PUBLISHED, publishedAt: { lte: now } };
}

/**
 * Editorial blog. Same workflow rules as concepts/guides: `concept.write` edits,
 * `concept.publish` publishes, the byline must be an active editor. Categories use `category.*`.
 */
@Injectable()
export class BlogService {
  constructor(private readonly db: DatabaseService) {}

  // ---------------------------------------------------------------- public

  async listPublic(query: BlogListQueryDto) {
    const where: Prisma.BlogPostWhereInput = {
      ...publicWhere(),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.featured ? { featured: true } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { excerpt: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    if (query.tag) {
      // Tags are stored as typed; the URL carries a slug. Resolve the slug to the stored spellings.
      const wanted = tagSlug(query.tag);
      const rows = await this.db.blogPost.findMany({
        where: publicWhere(),
        select: { tags: true },
      });
      const spellings = [...new Set(rows.flatMap((row) => row.tags))].filter(
        (tag) => tagSlug(tag) === wanted,
      );
      if (!spellings.length) return this.emptyPage(query);
      where.tags = { hasSome: spellings };
    }
    const [data, total] = await this.db.$transaction([
      this.db.blogPost.findMany({
        where,
        select: summarySelect,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.blogPost.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  }

  private emptyPage(query: BlogListQueryDto) {
    return {
      data: [],
      meta: { page: query.page, pageSize: query.pageSize, total: 0, pageCount: 1 },
    };
  }

  async getPublic(slug: string) {
    const post = await this.db.blogPost.findFirst({
      where: { slug, ...publicWhere() },
      select: detailSelect,
    });
    if (!post) throw new NotFoundException('Yazı bulunamadı.');
    const related = await this.db.blogPost.findMany({
      where: {
        ...publicWhere(),
        id: { not: post.id },
        ...(post.category ? { category: { id: post.category.id } } : {}),
      },
      select: summarySelect,
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });
    // Raw update so the view counter does not touch `updated_at` (sitemap lastmod, dateModified).
    void this.db
      .$executeRaw`UPDATE "blog_posts" SET "view_count" = "view_count" + 1 WHERE "id" = ${post.id}::uuid`.catch(
      () => undefined,
    );
    return { ...post, related };
  }

  /** Published categories with their public post counts (empty categories are still listed). */
  async listCategoriesPublic() {
    const categories = await this.db.blogCategory.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        ...categorySelect,
        description: true,
        _count: { select: { posts: { where: publicWhere() } } },
      },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      postCount: _count.posts,
    }));
  }

  /** Distinct public tags with counts, most used first (for the tag cloud / sitemap). */
  async listTagsPublic() {
    const rows = await this.db.blogPost.findMany({ where: publicWhere(), select: { tags: true } });
    const counts = new Map<string, { tag: string; count: number }>();
    for (const tag of rows.flatMap((row) => row.tags)) {
      const key = tagSlug(tag);
      const entry = counts.get(key) ?? { tag, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    }
    return [...counts.entries()]
      .map(([slug, { tag, count }]) => ({ slug, tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'tr'));
  }

  // ---------------------------------------------------------------- admin: posts

  async listAdmin(query: BlogAdminListQueryDto) {
    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { slug: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.blogPost.findMany({
        where,
        select: adminSelect,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.blogPost.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async create(input: CreateBlogPostDto, actor: AccessClaims) {
    const slug = blogSlugify(input.slug ?? input.title);
    if (!slug) throw new BadRequestException('Kısa ad üretilemedi.');
    if (await this.db.blogPost.findUnique({ where: { slug } }))
      throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    const status = input.status ?? ContentStatus.DRAFT;
    assertCanPublish(status, actor);
    const authorId = await resolveEditorialAuthor(this.db, input.authorId, actor);
    if (input.categoryId) await this.assertCategory(input.categoryId);
    return this.db.blogPost.create({
      data: {
        title: input.title,
        slug,
        excerpt: input.excerpt,
        body: input.body,
        categoryId: input.categoryId ?? null,
        coverImageUrl: input.coverImageUrl || null,
        coverImageAlt: input.coverImageAlt || null,
        tags: normaliseTags(input.tags),
        status,
        indexability: input.indexability ?? 'INDEX',
        featured: input.featured ?? false,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        readingMinutes: readingMinutesFor(input.excerpt, input.body),
        publishedAt: resolvePublishedAt({
          status,
          requested:
            input.publishedAt === undefined ? undefined : this.parseDate(input.publishedAt),
          current: null,
        }),
        authorId,
        createdById: actor.sub,
        updatedById: actor.sub,
      },
      select: adminSelect,
    });
  }

  async update(id: string, input: UpdateBlogPostDto, actor: AccessClaims) {
    const current = await this.db.blogPost.findUnique({
      where: { id },
      select: { id: true, slug: true, status: true, publishedAt: true, excerpt: true, body: true },
    });
    if (!current) throw new NotFoundException('Yazı bulunamadı.');
    const status = input.status ?? current.status;
    // Publishing, or editing something already public, needs the publish permission.
    if (status === ContentStatus.PUBLISHED || current.status === ContentStatus.PUBLISHED)
      assertCanPublish(ContentStatus.PUBLISHED, actor);
    const data: Prisma.BlogPostUncheckedUpdateInput = { updatedById: actor.sub, status };
    if (input.slug !== undefined || input.title !== undefined) {
      const slug = blogSlugify(input.slug || input.title || current.slug);
      if (slug !== current.slug) {
        if (!slug) throw new BadRequestException('Kısa ad üretilemedi.');
        if (await this.db.blogPost.findUnique({ where: { slug } }))
          throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
        data.slug = slug;
      }
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.body !== undefined) data.body = input.body;
    if (input.excerpt !== undefined || input.body !== undefined)
      data.readingMinutes = readingMinutesFor(
        input.excerpt ?? current.excerpt,
        input.body ?? current.body,
      );
    if (input.categoryId !== undefined) {
      if (input.categoryId) await this.assertCategory(input.categoryId);
      data.categoryId = input.categoryId || null;
    }
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl || null;
    if (input.coverImageAlt !== undefined) data.coverImageAlt = input.coverImageAlt || null;
    if (input.tags !== undefined) data.tags = normaliseTags(input.tags);
    if (input.indexability !== undefined) data.indexability = input.indexability;
    if (input.featured !== undefined) data.featured = input.featured;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle || null;
    if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription || null;
    if (input.authorId !== undefined)
      data.authorId = await resolveEditorialAuthor(this.db, input.authorId, actor);
    data.publishedAt = resolvePublishedAt({
      status,
      requested: input.publishedAt === undefined ? undefined : this.parseDate(input.publishedAt),
      current: current.publishedAt,
    });
    return this.db.blogPost.update({ where: { id }, data, select: adminSelect });
  }

  async remove(id: string, actor: AccessClaims) {
    const current = await this.db.blogPost.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) throw new NotFoundException('Yazı bulunamadı.');
    if (
      current.status === ContentStatus.PUBLISHED &&
      !actor.permissions.includes('concept.publish')
    )
      throw new ForbiddenException('Yayındaki bir yazıyı silmek için concept.publish gerekir.');
    await this.db.blogPost.delete({ where: { id } });
    return { ok: true };
  }

  // ---------------------------------------------------------------- admin: categories

  async listCategoriesAdmin() {
    const categories = await this.db.blogCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
    return {
      data: categories.map(({ _count, ...category }) => ({ ...category, postCount: _count.posts })),
    };
  }

  async createCategory(input: CreateBlogCategoryDto) {
    const slug = blogSlugify(input.slug ?? input.name);
    if (!slug) throw new BadRequestException('Kısa ad üretilemedi.');
    if (await this.db.blogCategory.findUnique({ where: { slug } }))
      throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
    return this.db.blogCategory.create({
      data: {
        name: input.name,
        slug,
        description: input.description || null,
        status: input.status ?? ContentStatus.PUBLISHED,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(id: string, input: UpdateBlogCategoryDto) {
    const current = await this.db.blogCategory.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Kategori bulunamadı.');
    const data: Prisma.BlogCategoryUpdateInput = {};
    if (input.slug !== undefined || input.name !== undefined) {
      const slug = blogSlugify(input.slug || input.name || current.slug);
      if (slug !== current.slug) {
        if (await this.db.blogCategory.findUnique({ where: { slug } }))
          throw new ConflictException('Bu kısa ad zaten kullanılıyor.');
        data.slug = slug;
      }
    }
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.status !== undefined) data.status = input.status;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    return this.db.blogCategory.update({ where: { id }, data });
  }

  /** Posts keep existing (category becomes empty) — deleting a category never deletes content. */
  async removeCategory(id: string) {
    if (!(await this.db.blogCategory.findUnique({ where: { id }, select: { id: true } })))
      throw new NotFoundException('Kategori bulunamadı.');
    await this.db.blogCategory.delete({ where: { id } });
    return { ok: true };
  }

  // ---------------------------------------------------------------- helpers

  private async assertCategory(id: string) {
    if (!(await this.db.blogCategory.findUnique({ where: { id }, select: { id: true } })))
      throw new BadRequestException('Blog kategorisi bulunamadı.');
  }

  private parseDate(value: string | null) {
    if (value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Geçersiz yayın tarihi.');
    return date;
  }
}
