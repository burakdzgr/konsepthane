import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionVisibility,
  CommunityContentType,
  CommunityVisibility,
  ContentStatus,
  ExperienceStatus,
  IndexabilityStatus,
  ModerationActionType,
  ModerationStatus,
  NotificationType,
  PollStatus,
  Prisma,
  QuestionStatus,
  ReactionType,
  ReportStatus,
} from '@ilham/database';
import { DatabaseService } from '../common/database.module';
import { publicAuthorSelect } from '../common/public-author';
import type {
  AddCollectionItemDto,
  CommunityListDto,
  CreateAnswerDto,
  CreateCollectionDto,
  CreateCommentDto,
  CreateConceptSuggestionDto,
  CreateDiscussionDto,
  CreateExperienceDto,
  CreatePollDto,
  CreateQuestionDto,
  CreateReportDto,
  InteractionDto,
  ModerateCommentDto,
  ModerateExperienceDto,
  ModerateQuestionDto,
  ModerationActionDto,
  ModerationQueryDto,
  UpdateCollectionDto,
} from './community.dto';
import { evaluateCommunityIndexability } from '@ilham/seo';

type FeedItem = {
  id: string;
  type: CommunityContentType;
  slug: string;
  title: string;
  summary: string;
  href: string;
  imageUrl?: string | null;
  author: { username: string | null; displayName: string; avatarUrl: string | null } | null;
  publishedAt: Date;
  featured: boolean;
  reactionCount: number;
  responseCount: number;
  saveCount: number;
  score?: number;
};

type FeedSource = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  description?: string | null;
  body?: string | null;
  heroImageUrl?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
  featured?: boolean;
  reactionCount?: number;
  saveCount?: number;
  author?: {
    profile: { username: string | null; displayName: string; avatarUrl: string | null } | null;
  } | null;
};

type PublicCollectionRow = Prisma.CollectionGetPayload<{
  include: {
    owner: { include: { profile: true } };
    items: true;
  };
}>;

type ResolvedContent = {
  type: CommunityContentType;
  title: string;
  summary: string | null;
  href: string;
  imageUrl: string | null;
  meta: string | null;
};

const contentHref: Record<CommunityContentType, string> = {
  INSPIRATION: '/konsept',
  QUESTION: '/soru',
  DISCUSSION: '/tartisma',
  EVENT_EXPERIENCE: '/deneyim',
  POLL: '/anket',
  GUIDE: '/rehber',
};

@Injectable()
export class CommunityService {
  constructor(private readonly db: DatabaseService) {}

  async createConceptSuggestion(userId: string, input: CreateConceptSuggestionDto) {
    const category = await this.db.category.findFirst({
      where: { id: input.categoryId, status: ContentStatus.PUBLISHED },
      select: { id: true },
    });
    if (!category) throw new BadRequestException('Geçerli bir kategori seçmelisiniz.');
    const imageUrls = input.imageUrls ?? [];
    return this.db.$transaction(async (tx) => {
      const item = await tx.concept.create({
        data: {
          categoryId: category.id,
          authorId: userId,
          title: input.title,
          slug: `${this.slugify(input.title)}-${Date.now().toString(36)}`,
          summary: input.summary,
          description: input.body,
          heroImageUrl: imageUrls[0] ?? null,
          heroImageAlt: imageUrls[0] ? `${input.title} için gönderilen görsel` : null,
          status: ContentStatus.DRAFT,
          visibility: CommunityVisibility.PUBLIC,
          moderationStatus: ModerationStatus.UNDER_REVIEW,
          indexability: IndexabilityStatus.NOINDEX,
          ...(imageUrls.length
            ? {
                images: {
                  create: imageUrls.map((url, sortOrder) => ({
                    url,
                    altText: `${input.title} görseli ${sortOrder + 1}`,
                    sortOrder,
                  })),
                },
              }
            : {}),
        },
        include: { images: true, category: true },
      });
      await tx.profile.updateMany({
        where: { userId },
        data: { contributionCount: { increment: 1 } },
      });
      return item;
    });
  }

  async feed(query: CommunityListDto) {
    const take = Math.min(query.pageSize * 2, 50);
    const publicWhere = {
      visibility: CommunityVisibility.PUBLIC,
      moderationStatus: ModerationStatus.APPROVED,
    } as const;
    const [concepts, questions, discussions, stories, polls, guides] = await this.db.$transaction([
      this.db.concept.findMany({
        where: { status: ContentStatus.PUBLISHED, ...publicWhere },
        include: { author: { select: publicAuthorSelect } },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
      this.db.question.findMany({
        where: publicWhere,
        include: { author: { select: publicAuthorSelect } },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
      this.db.discussion.findMany({
        where: publicWhere,
        include: { author: { select: publicAuthorSelect } },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
      this.db.experience.findMany({
        where: { status: 'APPROVED', visibility: CommunityVisibility.PUBLIC },
        include: { author: { select: publicAuthorSelect }, images: { take: 1 } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.db.poll.findMany({
        where: publicWhere,
        include: {
          author: { select: publicAuthorSelect },
          options: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
      this.db.guide.findMany({
        where: { status: ContentStatus.PUBLISHED, ...publicWhere },
        include: { author: { select: publicAuthorSelect } },
        orderBy: { publishedAt: 'desc' },
        take,
      }),
    ]);

    const items: FeedItem[] = [
      ...concepts.map((item) =>
        this.toFeedItem(item, CommunityContentType.INSPIRATION, `/konsept/${item.slug}`),
      ),
      ...questions.map((item) =>
        this.toFeedItem(
          item,
          CommunityContentType.QUESTION,
          `/soru/${item.slug}`,
          item.body,
          item.answerCount,
        ),
      ),
      ...discussions.map((item) =>
        this.toFeedItem(
          item,
          CommunityContentType.DISCUSSION,
          `/tartisma/${item.slug}`,
          item.body,
          item.commentCount,
        ),
      ),
      ...stories.map((item) =>
        this.toFeedItem(
          item,
          CommunityContentType.EVENT_EXPERIENCE,
          `/deneyim/${item.slug}`,
          item.summary ?? item.body,
          item.commentCount,
        ),
      ),
      ...polls.map((item) =>
        this.toFeedItem(
          item,
          CommunityContentType.POLL,
          `/anket/${item.slug}`,
          item.body ?? '',
          item.voteCount,
        ),
      ),
      ...guides.map((item) =>
        this.toFeedItem(
          item,
          CommunityContentType.GUIDE,
          `/rehber/${item.slug}`,
          item.summary,
          item.commentCount,
        ),
      ),
    ];
    const now = Date.now();
    for (const item of items) {
      const ageHours = Math.max(0, (now - item.publishedAt.getTime()) / 3_600_000);
      const freshness = Math.max(0, 72 - ageHours) / 6;
      item.score = Number(
        (
          freshness +
          Math.min(item.reactionCount, 20) * 2 +
          Math.min(item.responseCount, 15) * 3 +
          (item.featured ? 30 : 0)
        ).toFixed(3),
      );
    }
    items.sort((a, b) => {
      if (query.tab === 'new')
        return b.publishedAt.getTime() - a.publishedAt.getTime() || a.id.localeCompare(b.id);
      return (
        (b.score ?? 0) - (a.score ?? 0) ||
        b.publishedAt.getTime() - a.publishedAt.getTime() ||
        a.id.localeCompare(b.id)
      );
    });
    const start = (query.page - 1) * query.pageSize;
    return {
      data: items.slice(start, start + query.pageSize),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total: items.length,
        algorithm: 'community-v1-deterministic',
      },
    };
  }

  async overview() {
    const [members, questions, discussions, inspirations, experiences, topics] =
      await this.db.$transaction([
        this.db.user.count({ where: { status: 'ACTIVE' } }),
        this.db.question.count({ where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' } }),
        this.db.discussion.count({ where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' } }),
        this.db.concept.count({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' } }),
        this.db.experience.count({ where: { status: 'APPROVED', visibility: 'PUBLIC' } }),
        this.db.topic.count(),
      ]);
    return { members, questions, discussions, inspirations, experiences, topics };
  }

  async me(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: { include: { role: { select: { key: true } } } },
      },
    });
    if (!user || user.status !== 'ACTIVE') throw new NotFoundException('Üye bulunamadı.');
    const [unreadNotifications, savedCount, collectionCount] = await this.db.$transaction([
      this.db.notification.count({ where: { userId, readAt: null } }),
      this.db.contentSave.count({ where: { userId } }),
      this.db.collection.count({ where: { ownerId: userId } }),
    ]);
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((entry) => entry.role.key),
      profile: user.profile
        ? {
            displayName: user.profile.displayName,
            username: user.profile.username,
            avatarUrl: user.profile.avatarUrl,
            kind: user.profile.kind,
          }
        : null,
      unreadNotifications,
      savedCount,
      collectionCount,
    };
  }

  async interactionState(userId: string, contentType: CommunityContentType, contentId: string) {
    const [saved, liked, collections] = await this.db.$transaction([
      this.db.contentSave.findUnique({
        where: { userId_contentType_contentId: { userId, contentType, contentId } },
        select: { id: true },
      }),
      this.db.contentReaction.findUnique({
        where: {
          userId_contentType_contentId_type: {
            userId,
            contentType,
            contentId,
            type: ReactionType.LIKE,
          },
        },
        select: { id: true },
      }),
      this.db.collectionItem.findMany({
        where: { collection: { ownerId: userId }, entityType: contentType, entityId: contentId },
        select: { collectionId: true },
      }),
    ]);
    const following =
      contentType === CommunityContentType.QUESTION
        ? await this.db.questionFollow.findUnique({
            where: { questionId_userId: { questionId: contentId, userId } },
            select: { userId: true },
          })
        : null;
    return {
      saved: Boolean(saved),
      liked: Boolean(liked),
      following: Boolean(following),
      collectionIds: collections.map((entry) => entry.collectionId),
    };
  }

  async savedItems(userId: string) {
    const saves = await this.db.contentSave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const content = await this.resolveContent(
      saves.map((entry) => ({ entityType: entry.contentType, entityId: entry.contentId })),
    );
    return saves
      .map((entry) => ({
        id: entry.id,
        contentType: entry.contentType,
        contentId: entry.contentId,
        savedAt: entry.createdAt,
        content: content.get(`${entry.contentType}:${entry.contentId}`) ?? null,
      }))
      .filter((entry) => entry.content);
  }

  async listTopics(query: CommunityListDto) {
    const topics = await this.db.topic.findMany({
      ...(query.q ? { where: { name: { contains: query.q, mode: 'insensitive' as const } } } : {}),
      orderBy: [{ featured: 'desc' }, { contentCount: 'desc' }, { name: 'asc' }],
      take: query.pageSize,
      skip: (query.page - 1) * query.pageSize,
    });
    const counts = await this.topicContentCounts(topics.map((topic) => topic.id));
    return topics.map((topic) => ({ ...topic, contentCounts: counts.get(topic.id) ?? {} }));
  }

  /**
   * Per-type content counts behind topics (`{ INSPIRATION: 3, QUESTION: 2, … }`) — the input of the
   * hub indexability policy (`@ilham/seo` → `shouldIndexHub`), so pages and the sitemap decide alike.
   */
  private async topicContentCounts(topicIds: string[]) {
    const rows = topicIds.length
      ? await this.db.contentTopic.groupBy({
          by: ['topicId', 'contentType'],
          where: { topicId: { in: topicIds } },
          _count: { _all: true },
        })
      : [];
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const entry = map.get(row.topicId) ?? {};
      entry[row.contentType] = row._count._all;
      map.set(row.topicId, entry);
    }
    return map;
  }

  eventTypes() {
    return this.db.eventType.findMany({ orderBy: { name: 'asc' } });
  }

  async getTopic(slug: string) {
    const topic = await this.db.topic.findUnique({
      where: { slug },
      include: { contentLinks: { take: 100, orderBy: { createdAt: 'desc' } } },
    });
    if (!topic) throw new NotFoundException('Konu bulunamadı.');
    // Hydrate the public, published content behind the links so the topic hub is a real page
    // (titles, summaries, links) rather than a bag of typed ids.
    const content = await this.resolveContent(
      topic.contentLinks.map((link) => ({
        entityType: link.contentType,
        entityId: link.contentId,
      })),
    );
    const items = topic.contentLinks.flatMap((link) => {
      const entry = content.get(`${link.contentType}:${link.contentId}`);
      return entry ? [{ id: link.contentId, ...entry }] : [];
    });
    // Counts reflect what is actually public/published (resolved), not raw link rows.
    const contentCounts = items.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});
    const imageCount = items.filter((item) => item.imageUrl).length;
    return { ...topic, items, contentCounts, imageCount };
  }

  async listQuestions(query: CommunityListDto, followerId?: string) {
    const where: Prisma.QuestionWhereInput = {
      moderationStatus: ModerationStatus.APPROVED,
      visibility: CommunityVisibility.PUBLIC,
      ...(query.tab === 'unanswered' ? { answerCount: 0 } : {}),
      ...(query.tab === 'following' && followerId
        ? { follows: { some: { userId: followerId } } }
        : {}),
      ...(query.concept ? { concept: { slug: query.concept } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.question.findMany({
        where,
        include: {
          author: { select: publicAuthorSelect },
          acceptedAnswer: true,
          concept: { select: { title: true, slug: true } },
          eventType: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy:
          query.tab === 'popular'
            ? [
                { featured: 'desc' },
                { answerCount: 'desc' },
                { reactionCount: 'desc' },
                { createdAt: 'desc' },
              ]
            : [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.question.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async toggleQuestionFollow(userId: string, questionId: string) {
    const question = await this.db.question.findFirst({
      where: { id: questionId, visibility: CommunityVisibility.PUBLIC },
      select: { id: true },
    });
    if (!question) throw new NotFoundException('Soru bulunamadı.');
    const key = { questionId_userId: { questionId, userId } };
    const existing = await this.db.questionFollow.findUnique({ where: key });
    return this.db.$transaction(async (tx) => {
      if (existing) await tx.questionFollow.delete({ where: key });
      else await tx.questionFollow.create({ data: { questionId, userId } });
      await tx.question.update({
        where: { id: questionId },
        data: { followerCount: { increment: existing ? -1 : 1 } },
      });
      return { active: !existing };
    });
  }

  async getQuestion(slug: string) {
    const item = await this.db.question.findFirst({
      where: {
        slug,
        visibility: CommunityVisibility.PUBLIC,
        moderationStatus: ModerationStatus.APPROVED,
      },
      include: {
        author: { select: publicAuthorSelect },
        acceptedAnswer: true,
        concept: { select: { title: true, slug: true } },
        eventType: true,
        images: { orderBy: { sortOrder: 'asc' } },
        answers: {
          where: {
            visibility: CommunityVisibility.PUBLIC,
            moderationStatus: ModerationStatus.APPROVED,
          },
          include: { author: { select: publicAuthorSelect } },
          orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!item) throw new NotFoundException('Soru bulunamadı.');
    return item;
  }

  async createQuestion(userId: string, input: CreateQuestionDto) {
    const slug = await this.uniqueSlug('question', input.title);
    const indexability = await this.decideIndexability('question', input.title, input.body, slug);
    return this.db.$transaction(async (tx) => {
      const item = await tx.question.create({
        data: {
          authorId: userId,
          title: input.title,
          slug,
          body: input.body,
          conceptId: input.conceptId ?? null,
          eventTypeId: input.eventTypeId ?? null,
          moderationStatus: ModerationStatus.APPROVED,
          indexability,
          publishedAt: new Date(),
          images: {
            create: (input.imageUrls ?? []).map((url, sortOrder) => ({
              url,
              altText: `${input.title} için kullanıcı görseli ${sortOrder + 1}`,
              sortOrder,
            })),
          },
        },
      });
      if (input.conceptId)
        await tx.concept.update({
          where: { id: input.conceptId },
          data: { questionCount: { increment: 1 } },
        });
      await this.attachTopics(tx, CommunityContentType.QUESTION, item.id, input.topicIds);
      await tx.profile.updateMany({
        where: { userId },
        data: { contributionCount: { increment: 1 } },
      });
      return item;
    });
  }

  async addAnswer(userId: string, questionId: string, input: CreateAnswerDto) {
    const question = await this.db.question.findFirst({
      where: {
        id: questionId,
        visibility: CommunityVisibility.PUBLIC,
        status: { in: [QuestionStatus.OPEN, QuestionStatus.ANSWERED] },
      },
    });
    if (!question) throw new NotFoundException('Yanıtlanabilir soru bulunamadı.');
    return this.db.$transaction(async (tx) => {
      const answer = await tx.answer.create({
        data: { questionId, authorId: userId, body: input.body },
      });
      await tx.question.update({
        where: { id: questionId },
        data: { answerCount: { increment: 1 }, status: QuestionStatus.ANSWERED },
      });
      if (question.authorId !== userId)
        await tx.notification.create({
          data: {
            userId: question.authorId,
            actorId: userId,
            type: NotificationType.ANSWER,
            contentType: CommunityContentType.QUESTION,
            entityId: questionId,
            message: 'Soruna yeni bir yanıt geldi.',
          },
        });
      return answer;
    });
  }

  async acceptAnswer(userId: string, questionId: string, answerId: string) {
    const question = await this.db.question.findUnique({ where: { id: questionId } });
    if (!question) throw new NotFoundException('Soru bulunamadı.');
    if (question.authorId !== userId)
      throw new ForbiddenException('Yalnızca soru sahibi yanıt kabul edebilir.');
    const answer = await this.db.answer.findFirst({
      where: { id: answerId, questionId, visibility: CommunityVisibility.PUBLIC },
    });
    if (!answer) throw new BadRequestException('Yanıt bu soruya ait değil.');
    return this.db.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id: questionId },
        data: { acceptedAnswerId: answerId, status: QuestionStatus.RESOLVED },
      });
      if (answer.authorId !== userId)
        await tx.notification.create({
          data: {
            userId: answer.authorId,
            actorId: userId,
            type: NotificationType.ACCEPTED_ANSWER,
            contentType: CommunityContentType.QUESTION,
            entityId: questionId,
            message: 'Yanıtın kabul edildi.',
          },
        });
      return updated;
    });
  }

  async listDiscussions(query: CommunityListDto) {
    const where: Prisma.DiscussionWhereInput = {
      moderationStatus: ModerationStatus.APPROVED,
      visibility: CommunityVisibility.PUBLIC,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.discussion.findMany({
        where,
        include: { author: { select: publicAuthorSelect } },
        orderBy: [{ pinned: 'desc' }, { featured: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.discussion.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async getDiscussion(slug: string) {
    const item = await this.db.discussion.findFirst({
      where: {
        slug,
        visibility: CommunityVisibility.PUBLIC,
        moderationStatus: ModerationStatus.APPROVED,
      },
      include: { author: { select: publicAuthorSelect } },
    });
    if (!item) throw new NotFoundException('Tartışma bulunamadı.');
    return { ...item, comments: await this.listComments(CommunityContentType.DISCUSSION, item.id) };
  }

  async createDiscussion(userId: string, input: CreateDiscussionDto) {
    const slug = await this.uniqueSlug('discussion', input.title);
    const indexability = await this.decideIndexability(
      'discussion',
      input.title,
      input.body,
      slug,
      180,
    );
    return this.db.$transaction(async (tx) => {
      const item = await tx.discussion.create({
        data: {
          authorId: userId,
          title: input.title,
          slug,
          body: input.body,
          moderationStatus: ModerationStatus.APPROVED,
          indexability,
          publishedAt: new Date(),
        },
      });
      await this.attachTopics(tx, CommunityContentType.DISCUSSION, item.id, input.topicIds);
      return item;
    });
  }

  async getPoll(slug: string) {
    const item = await this.db.poll.findFirst({
      where: {
        slug,
        visibility: CommunityVisibility.PUBLIC,
        moderationStatus: ModerationStatus.APPROVED,
      },
      include: {
        author: { select: publicAuthorSelect },
        options: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!item) throw new NotFoundException('Anket bulunamadı.');
    return item;
  }

  async createPoll(userId: string, input: CreatePollDto) {
    const slug = await this.uniqueSlug('poll', input.title);
    return this.db.$transaction(async (tx) => {
      const item = await tx.poll.create({
        data: {
          authorId: userId,
          title: input.title,
          slug,
          body: input.body ?? null,
          moderationStatus: ModerationStatus.APPROVED,
          indexability: IndexabilityStatus.NOINDEX,
          publishedAt: new Date(),
          options: { create: input.options.map((label, sortOrder) => ({ label, sortOrder })) },
        },
        include: { options: true },
      });
      await this.attachTopics(tx, CommunityContentType.POLL, item.id, input.topicIds);
      return item;
    });
  }

  async vote(userId: string, pollId: string, optionId: string) {
    const option = await this.db.pollOption.findFirst({
      where: { id: optionId, pollId },
      include: { poll: true },
    });
    if (
      !option ||
      option.poll.status !== PollStatus.OPEN ||
      (option.poll.closesAt && option.poll.closesAt < new Date())
    )
      throw new BadRequestException('Anket oylamaya açık değil.');
    try {
      return await this.db.$transaction(async (tx) => {
        const vote = await tx.pollVote.create({ data: { pollId, optionId, userId } });
        await tx.poll.update({ where: { id: pollId }, data: { voteCount: { increment: 1 } } });
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });
        return vote;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Bu ankette daha önce oy kullandın.');
      throw error;
    }
  }

  async getGuide(slug: string) {
    const item = await this.db.guide.findFirst({
      where: {
        slug,
        status: ContentStatus.PUBLISHED,
        visibility: CommunityVisibility.PUBLIC,
        moderationStatus: ModerationStatus.APPROVED,
      },
      include: { author: { select: publicAuthorSelect } },
    });
    if (!item) throw new NotFoundException('Rehber bulunamadı.');
    return item;
  }

  async listExperiences(query: CommunityListDto) {
    const where: Prisma.ExperienceWhereInput = {
      status: 'APPROVED',
      visibility: CommunityVisibility.PUBLIC,
      ...(query.eventType ? { eventType: { slug: query.eventType } } : {}),
      ...(query.venue ? { venueType: { contains: query.venue, mode: 'insensitive' } } : {}),
      ...(query.concept ? { concept: { slug: query.concept } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { body: { contains: query.q, mode: 'insensitive' } },
              { themeVariation: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.experience.findMany({
        where,
        include: {
          author: { select: publicAuthorSelect },
          concept: { select: { title: true, slug: true } },
          eventType: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy:
          query.sort === 'new'
            ? [{ createdAt: 'desc' }]
            : [{ featured: 'desc' }, { reactionCount: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.experience.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async getExperience(slug: string) {
    const item = await this.db.experience.findFirst({
      where: { slug, status: 'APPROVED', visibility: CommunityVisibility.PUBLIC },
      include: {
        author: { select: publicAuthorSelect },
        concept: { select: { id: true, title: true, slug: true, heroImageUrl: true } },
        eventType: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!item) throw new NotFoundException('Organizasyon deneyimi bulunamadı.');
    return {
      ...item,
      comments: await this.listComments(CommunityContentType.EVENT_EXPERIENCE, item.id),
    };
  }

  async createExperience(userId: string, input: CreateExperienceDto) {
    if (!input.imageUrls.length)
      throw new BadRequestException('Deneyim paylaşmak için en az bir fotoğraf gerekir.');
    if (input.conceptId)
      await this.db.concept.findUniqueOrThrow({ where: { id: input.conceptId } });
    if (input.eventTypeId)
      await this.db.eventType.findUniqueOrThrow({ where: { id: input.eventTypeId } });
    const slug = await this.uniqueSlug('experience', input.title);
    return this.db.$transaction(async (tx) => {
      const item = await tx.experience.create({
        data: {
          authorId: userId,
          conceptId: input.conceptId ?? null,
          eventTypeId: input.eventTypeId ?? null,
          title: input.title,
          slug,
          body: input.body,
          summary: input.body.slice(0, 300),
          status: ExperienceStatus.SUBMITTED,
          city: input.city ?? null,
          venueType: input.venueType ?? null,
          guestCount: input.guestCount ?? null,
          ageLabel: input.ageLabel ?? null,
          budgetLabel: input.budgetLabel ?? null,
          themeVariation: input.themeVariation ?? null,
          colors: input.colors ?? [],
          tips: input.tips ?? null,
          whatWorked: input.whatWorked ?? null,
          whatWouldChange: input.whatWouldChange ?? null,
          heroImageUrl: input.imageUrls[0]!,
          indexability: IndexabilityStatus.NOINDEX,
          images: {
            create: input.imageUrls.map((url, sortOrder) => ({
              url,
              altText: `${input.title} deneyim fotoğrafı ${sortOrder + 1}`,
              sortOrder,
            })),
          },
        },
        include: { images: true, concept: true, eventType: true },
      });
      await this.attachTopics(tx, CommunityContentType.EVENT_EXPERIENCE, item.id, input.topicIds);
      await tx.profile.updateMany({
        where: { userId },
        data: { contributionCount: { increment: 1 } },
      });
      return item;
    });
  }

  async listPublicCollections(query: CommunityListDto) {
    const [items, total] = await this.db.$transaction([
      this.db.collection.findMany({
        where: { visibility: CollectionVisibility.PUBLIC },
        include: {
          owner: { include: { profile: true } },
          items: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ itemCount: 'desc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.collection.count({ where: { visibility: CollectionVisibility.PUBLIC } }),
    ]);
    return {
      data: await Promise.all(items.map((item) => this.hydrateCollection(item))),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async getPublicCollection(slug: string) {
    const item = await this.db.collection.findFirst({
      where: { slug, visibility: CollectionVisibility.PUBLIC },
      include: { owner: { include: { profile: true } }, items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Koleksiyon bulunamadı.');
    return this.hydrateCollection(item);
  }

  private async hydrateCollection(item: PublicCollectionRow) {
    const content = await this.resolveContent(item.items);
    return {
      ...item,
      items: item.items.map((entry) => ({
        ...entry,
        content: content.get(`${entry.entityType}:${entry.entityId}`) ?? null,
      })),
    };
  }

  private async resolveContent(entries: Array<{ entityType: string; entityId: string }>) {
    const ids = (type: CommunityContentType) =>
      entries.filter((entry) => entry.entityType === type).map((entry) => entry.entityId);
    const [concepts, guides, experiences, questions, discussions, polls] =
      await this.db.$transaction([
        this.db.concept.findMany({
          where: {
            id: { in: ids(CommunityContentType.INSPIRATION) },
            status: ContentStatus.PUBLISHED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: {
            id: true,
            title: true,
            summary: true,
            slug: true,
            heroImageUrl: true,
            category: { select: { name: true } },
          },
        }),
        this.db.guide.findMany({
          where: {
            id: { in: ids(CommunityContentType.GUIDE) },
            status: ContentStatus.PUBLISHED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: { id: true, title: true, summary: true, slug: true },
        }),
        this.db.experience.findMany({
          where: {
            id: { in: ids(CommunityContentType.EVENT_EXPERIENCE) },
            status: ExperienceStatus.APPROVED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: {
            id: true,
            title: true,
            summary: true,
            slug: true,
            heroImageUrl: true,
            ageLabel: true,
            venueType: true,
            images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        }),
        this.db.question.findMany({
          where: {
            id: { in: ids(CommunityContentType.QUESTION) },
            moderationStatus: ModerationStatus.APPROVED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: {
            id: true,
            title: true,
            body: true,
            slug: true,
            answerCount: true,
            images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        }),
        this.db.discussion.findMany({
          where: {
            id: { in: ids(CommunityContentType.DISCUSSION) },
            moderationStatus: ModerationStatus.APPROVED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: { id: true, title: true, body: true, slug: true, commentCount: true },
        }),
        this.db.poll.findMany({
          where: {
            id: { in: ids(CommunityContentType.POLL) },
            moderationStatus: ModerationStatus.APPROVED,
            visibility: CommunityVisibility.PUBLIC,
          },
          select: { id: true, title: true, body: true, slug: true, voteCount: true },
        }),
      ]);
    const content = new Map<string, ResolvedContent>();
    discussions.forEach((entry) =>
      content.set(`${CommunityContentType.DISCUSSION}:${entry.id}`, {
        type: CommunityContentType.DISCUSSION,
        title: entry.title,
        summary: entry.body,
        href: `${contentHref.DISCUSSION}/${entry.slug}`,
        imageUrl: null,
        meta: `${entry.commentCount} yorum`,
      }),
    );
    polls.forEach((entry) =>
      content.set(`${CommunityContentType.POLL}:${entry.id}`, {
        type: CommunityContentType.POLL,
        title: entry.title,
        summary: entry.body,
        href: `${contentHref.POLL}/${entry.slug}`,
        imageUrl: null,
        meta: `${entry.voteCount} oy`,
      }),
    );
    concepts.forEach((entry) =>
      content.set(`${CommunityContentType.INSPIRATION}:${entry.id}`, {
        type: CommunityContentType.INSPIRATION,
        title: entry.title,
        summary: entry.summary,
        href: `${contentHref.INSPIRATION}/${entry.slug}`,
        imageUrl: entry.heroImageUrl,
        meta: entry.category.name,
      }),
    );
    guides.forEach((entry) =>
      content.set(`${CommunityContentType.GUIDE}:${entry.id}`, {
        type: CommunityContentType.GUIDE,
        title: entry.title,
        summary: entry.summary,
        href: `${contentHref.GUIDE}/${entry.slug}`,
        imageUrl: null,
        meta: 'Rehber',
      }),
    );
    experiences.forEach((entry) =>
      content.set(`${CommunityContentType.EVENT_EXPERIENCE}:${entry.id}`, {
        type: CommunityContentType.EVENT_EXPERIENCE,
        title: entry.title,
        summary: entry.summary,
        href: `${contentHref.EVENT_EXPERIENCE}/${entry.slug}`,
        imageUrl: entry.images[0]?.url ?? entry.heroImageUrl,
        meta: [entry.ageLabel, entry.venueType].filter(Boolean).join(' · ') || 'Deneyim',
      }),
    );
    questions.forEach((entry) =>
      content.set(`${CommunityContentType.QUESTION}:${entry.id}`, {
        type: CommunityContentType.QUESTION,
        title: entry.title,
        summary: entry.body,
        href: `${contentHref.QUESTION}/${entry.slug}`,
        imageUrl: entry.images[0]?.url ?? null,
        meta: `${entry.answerCount} yanıt`,
      }),
    );
    return content;
  }

  async getProfile(username: string) {
    const profile = await this.db.profile.findUnique({
      where: { username },
      include: { user: { select: { id: true, createdAt: true, status: true, deletedAt: true } } },
    });
    if (!profile || !profile.isPublic || profile.user.deletedAt || profile.user.status !== 'ACTIVE')
      throw new NotFoundException('Üye bulunamadı.');
    const [questions, answers, experiences, collections, concepts] = await this.db.$transaction([
      this.db.question.findMany({
        where: { authorId: profile.userId, visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.db.answer.findMany({
        where: { authorId: profile.userId, visibility: 'PUBLIC', moderationStatus: 'APPROVED' },
        include: { question: { select: { title: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.db.experience.findMany({
        where: { authorId: profile.userId, visibility: 'PUBLIC', status: 'APPROVED' },
        include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, eventType: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.db.collection.findMany({
        where: { ownerId: profile.userId, visibility: 'PUBLIC' },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
      this.db.concept.findMany({
        where: { authorId: profile.userId, visibility: 'PUBLIC', status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);
    return { ...profile, questions, answers, experiences, collections, concepts };
  }

  listComments(contentType: CommunityContentType, contentId: string) {
    return this.db.comment.findMany({
      where: {
        entityType: contentType,
        entityId: contentId,
        parentId: null,
        visibility: CommunityVisibility.PUBLIC,
        moderationStatus: ModerationStatus.APPROVED,
      },
      include: {
        author: { select: publicAuthorSelect },
        replies: {
          where: {
            visibility: CommunityVisibility.PUBLIC,
            moderationStatus: ModerationStatus.APPROVED,
          },
          include: {
            author: { select: publicAuthorSelect },
            replies: {
              where: {
                visibility: CommunityVisibility.PUBLIC,
                moderationStatus: ModerationStatus.APPROVED,
              },
              include: { author: { select: publicAuthorSelect } },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addComment(userId: string, input: CreateCommentDto) {
    await this.assertContentExists(input.contentType, input.contentId);
    let depth = 0;
    let notifyUserId: string | null = null;
    if (input.parentId) {
      const parent = await this.db.comment.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.entityType !== input.contentType || parent.entityId !== input.contentId)
        throw new BadRequestException('Yanıtlanan yorum bu içeriğe ait değil.');
      depth = parent.depth + 1;
      if (depth > 2)
        throw new BadRequestException('Yorumlarda en fazla iki yanıt seviyesi kullanılabilir.');
      notifyUserId = parent.authorId;
    }
    return this.db.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          authorId: userId,
          parentId: input.parentId ?? null,
          entityType: input.contentType,
          entityId: input.contentId,
          body: input.body,
          depth,
        },
      });
      await this.updateCounter(tx, input.contentType, input.contentId, 'comment', 1);
      if (notifyUserId && notifyUserId !== userId)
        await tx.notification.create({
          data: {
            userId: notifyUserId,
            actorId: userId,
            type: NotificationType.REPLY,
            contentType: input.contentType,
            entityId: input.contentId,
            message: 'Yorumuna bir yanıt geldi.',
          },
        });
      return comment;
    });
  }

  async toggleReaction(userId: string, input: InteractionDto) {
    await this.assertContentExists(input.contentType, input.contentId);
    const key = {
      userId_contentType_contentId_type: {
        userId,
        contentType: input.contentType,
        contentId: input.contentId,
        type: input.reactionType ?? ReactionType.LIKE,
      },
    };
    const existing = await this.db.contentReaction.findUnique({ where: key });
    return this.db.$transaction(async (tx) => {
      if (existing) await tx.contentReaction.delete({ where: { id: existing.id } });
      else
        await tx.contentReaction.create({
          data: {
            userId,
            contentType: input.contentType,
            contentId: input.contentId,
            type: input.reactionType,
          },
        });
      await this.updateCounter(
        tx,
        input.contentType,
        input.contentId,
        'reaction',
        existing ? -1 : 1,
      );
      return { active: !existing };
    });
  }

  async toggleSave(userId: string, input: InteractionDto) {
    await this.assertContentExists(input.contentType, input.contentId);
    const key = {
      userId_contentType_contentId: {
        userId,
        contentType: input.contentType,
        contentId: input.contentId,
      },
    };
    const existing = await this.db.contentSave.findUnique({ where: key });
    return this.db.$transaction(async (tx) => {
      if (existing) await tx.contentSave.delete({ where: { id: existing.id } });
      else
        await tx.contentSave.create({
          data: { userId, contentType: input.contentType, contentId: input.contentId },
        });
      await this.updateCounter(tx, input.contentType, input.contentId, 'save', existing ? -1 : 1);
      return { active: !existing };
    });
  }

  async toggleUserFollow(userId: string, followingId: string) {
    if (userId === followingId) throw new BadRequestException('Kendini takip edemezsin.');
    if (!(await this.db.user.findUnique({ where: { id: followingId }, select: { id: true } })))
      throw new NotFoundException('Üye bulunamadı.');
    const key = { followerId_followingId: { followerId: userId, followingId } };
    const existing = await this.db.userFollow.findUnique({ where: key });
    return this.db.$transaction(async (tx) => {
      if (existing) await tx.userFollow.delete({ where: key });
      else await tx.userFollow.create({ data: { followerId: userId, followingId } });
      const amount = existing ? -1 : 1;
      await tx.profile.updateMany({
        where: { userId },
        data: { followingCount: { increment: amount } },
      });
      await tx.profile.updateMany({
        where: { userId: followingId },
        data: { followerCount: { increment: amount } },
      });
      if (!existing)
        await tx.notification.create({
          data: {
            userId: followingId,
            actorId: userId,
            type: NotificationType.FOLLOW,
            message: 'Yeni bir takipçin var.',
          },
        });
      return { active: !existing };
    });
  }

  notifications(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      include: { actor: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async createCollection(userId: string, input: CreateCollectionDto) {
    const slug = this.slugify(input.title);
    return this.db.collection.create({
      data: {
        ownerId: userId,
        title: input.title,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: input.description ?? null,
        visibility: input.isPublic ? CollectionVisibility.PUBLIC : CollectionVisibility.PRIVATE,
      },
    });
  }

  async collections(userId: string) {
    const items = await this.db.collection.findMany({
      where: { ownerId: userId },
      include: { owner: { include: { profile: true } }, items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(items.map((item) => this.hydrateCollection(item)));
  }

  async updateCollection(userId: string, collectionId: string, input: UpdateCollectionDto) {
    const collection = await this.db.collection.findFirst({
      where: { id: collectionId, ownerId: userId },
    });
    if (!collection) throw new NotFoundException('Koleksiyon bulunamadı.');
    return this.db.collection.update({
      where: { id: collectionId },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.visibility ? { visibility: input.visibility } : {}),
      },
    });
  }

  async removeCollectionItem(userId: string, collectionId: string, itemId: string) {
    const item = await this.db.collectionItem.findFirst({
      where: { id: itemId, collectionId, collection: { ownerId: userId } },
    });
    if (!item) throw new NotFoundException('Koleksiyon öğesi bulunamadı.');
    return this.db.$transaction(async (tx) => {
      await tx.collectionItem.delete({ where: { id: itemId } });
      await tx.collection.update({
        where: { id: collectionId },
        data: { itemCount: { decrement: 1 } },
      });
      return { removed: true };
    });
  }

  /** Same as `removeCollectionItem`, addressed by content instead of item id (content-page picker). */
  async removeCollectionItemByContent(
    userId: string,
    collectionId: string,
    input: AddCollectionItemDto,
  ) {
    const item = await this.db.collectionItem.findFirst({
      where: {
        collectionId,
        entityType: input.contentType,
        entityId: input.contentId,
        collection: { ownerId: userId },
      },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Koleksiyon öğesi bulunamadı.');
    return this.removeCollectionItem(userId, collectionId, item.id);
  }

  async addCollectionItem(userId: string, collectionId: string, input: AddCollectionItemDto) {
    const collection = await this.db.collection.findFirst({
      where: { id: collectionId, ownerId: userId },
    });
    if (!collection) throw new NotFoundException('Koleksiyon bulunamadı.');
    await this.assertContentExists(input.contentType, input.contentId);
    try {
      return await this.db.$transaction(async (tx) => {
        const item = await tx.collectionItem.create({
          data: {
            collectionId,
            entityType: input.contentType,
            entityId: input.contentId,
            sortOrder: collection.itemCount,
          },
        });
        const resolved = await this.resolveContent([
          { entityType: input.contentType, entityId: input.contentId },
        ]);
        const cover = resolved.get(`${input.contentType}:${input.contentId}`)?.imageUrl ?? null;
        await tx.collection.update({
          where: { id: collectionId },
          data: {
            itemCount: { increment: 1 },
            ...(!collection.coverImageUrl && cover ? { coverImageUrl: cover } : {}),
          },
        });
        return item;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('İçerik bu koleksiyonda zaten var.');
      throw error;
    }
  }

  async report(userId: string, input: CreateReportDto) {
    await this.assertContentExists(input.contentType, input.contentId);
    return this.db.$transaction(async (tx) => {
      const report = await tx.contentReport.create({
        data: {
          reporterId: userId,
          contentType: input.contentType,
          contentId: input.contentId,
          reason: input.reason,
          details: input.details ?? null,
        },
      });
      await tx.moderationCase.create({
        data: {
          reportId: report.id,
          contentType: input.contentType,
          contentId: input.contentId,
          priority: ['COPYRIGHT', 'PRIVACY'].includes(input.reason) ? 10 : 0,
          summary: input.details ?? null,
        },
      });
      return report;
    });
  }

  async adminOverview() {
    const [pending, reports, members, content, experiences] = await this.db.$transaction([
      this.db.moderationCase.count({
        where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } },
      }),
      this.db.contentReport.count({ where: { status: ReportStatus.OPEN } }),
      this.db.user.count({ where: { status: 'ACTIVE' } }),
      this.db.question.count(),
      this.db.experience.count(),
    ]);
    return { pending, reports, members, content, experiences };
  }

  /** Admin queues also show who the account is (e-mail); never used by public endpoints. */
  private readonly adminAuthorSelect = {
    ...publicAuthorSelect,
    email: true,
    status: true,
  } as const;

  async adminExperiences(query: CommunityListDto) {
    const [data, total] = await this.db.$transaction([
      this.db.experience.findMany({
        include: {
          author: { select: this.adminAuthorSelect },
          concept: { select: { id: true, title: true, slug: true } },
          eventType: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.experience.count(),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async updateExperience(id: string, input: ModerateExperienceDto) {
    const current = await this.db.experience.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Deneyim bulunamadı.');
    if (input.conceptId)
      await this.db.concept.findUniqueOrThrow({ where: { id: input.conceptId } });
    if (input.eventTypeId)
      await this.db.eventType.findUniqueOrThrow({ where: { id: input.eventTypeId } });
    const nextConceptId = input.conceptId ?? current.conceptId;
    const nextStatus = input.status ?? current.status;
    // Approval without an explicit editorial decision runs the shared quality gate, so an
    // approved-but-thin experience stays reachable yet NOINDEX.
    const gatedIndexability =
      !input.indexability &&
      nextStatus === ExperienceStatus.APPROVED &&
      current.status !== ExperienceStatus.APPROVED
        ? await this.decideIndexability(
            'experience',
            current.title,
            current.body,
            current.slug,
            180,
          )
        : undefined;
    return this.db.$transaction(async (tx) => {
      if (current.status === ExperienceStatus.APPROVED && current.conceptId)
        await tx.concept.update({
          where: { id: current.conceptId },
          data: { experienceCount: { decrement: 1 } },
        });
      const updated = await tx.experience.update({
        where: { id },
        data: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.indexability
            ? { indexability: input.indexability }
            : gatedIndexability
              ? { indexability: gatedIndexability }
              : {}),
          ...(typeof input.featured === 'boolean' ? { featured: input.featured } : {}),
          ...(input.conceptId ? { conceptId: input.conceptId } : {}),
          ...(input.eventTypeId ? { eventTypeId: input.eventTypeId } : {}),
        },
      });
      if (nextStatus === ExperienceStatus.APPROVED && nextConceptId)
        await tx.concept.update({
          where: { id: nextConceptId },
          data: { experienceCount: { increment: 1 } },
        });
      return updated;
    });
  }

  async removeExperienceImage(experienceId: string, imageId: string) {
    const images = await this.db.experienceImage.findMany({
      where: { experienceId },
      orderBy: { sortOrder: 'asc' },
    });
    if (images.length <= 1)
      throw new BadRequestException('Yayındaki bir deneyimde en az bir fotoğraf kalmalıdır.');
    const target = images.find((image) => image.id === imageId);
    if (!target) throw new NotFoundException('Deneyim görseli bulunamadı.');
    return this.db.$transaction(async (tx) => {
      await tx.experienceImage.delete({ where: { id: imageId } });
      const next = images.find((image) => image.id !== imageId)!;
      await tx.experience.updateMany({
        where: { id: experienceId, heroImageUrl: target.url },
        data: { heroImageUrl: next.url },
      });
      return { removed: true };
    });
  }

  async adminQuestions(query: CommunityListDto) {
    const where: Prisma.QuestionWhereInput = query.q
      ? { title: { contains: query.q, mode: 'insensitive' } }
      : {};
    const [data, total] = await this.db.$transaction([
      this.db.question.findMany({
        where,
        include: {
          author: { select: this.adminAuthorSelect },
          concept: { select: { id: true, title: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' } },
          answers: {
            include: { author: { select: this.adminAuthorSelect } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.question.count({ where }),
    ]);
    return { data, meta: { page: query.page, pageSize: query.pageSize, total } };
  }

  async updateQuestion(id: string, input: ModerateQuestionDto) {
    const current = await this.db.question.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Soru bulunamadı.');
    const wasPublic =
      current.moderationStatus === ModerationStatus.APPROVED &&
      current.visibility === CommunityVisibility.PUBLIC;
    const nextModeration = input.moderationStatus ?? current.moderationStatus;
    const nextVisibility = input.visibility ?? current.visibility;
    const isPublic =
      nextModeration === ModerationStatus.APPROVED && nextVisibility === CommunityVisibility.PUBLIC;
    return this.db.$transaction(async (tx) => {
      const updated = await tx.question.update({
        where: { id },
        data: {
          ...(input.moderationStatus ? { moderationStatus: input.moderationStatus } : {}),
          ...(input.visibility ? { visibility: input.visibility } : {}),
          ...(input.indexability ? { indexability: input.indexability } : {}),
          ...(typeof input.featured === 'boolean' ? { featured: input.featured } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
      if (current.conceptId && wasPublic !== isPublic)
        await tx.concept.update({
          where: { id: current.conceptId },
          data: { questionCount: { increment: isPublic ? 1 : -1 } },
        });
      return updated;
    });
  }

  async adminComments(query: CommunityListDto) {
    const [data, total] = await this.db.$transaction([
      this.db.comment.findMany({
        include: { author: { select: this.adminAuthorSelect } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.comment.count(),
    ]);
    const content = await this.resolveContent(
      data.map((entry) => ({ entityType: entry.entityType, entityId: entry.entityId })),
    );
    return {
      data: data.map((entry) => ({
        ...entry,
        content: content.get(`${entry.entityType}:${entry.entityId}`) ?? null,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async updateComment(id: string, input: ModerateCommentDto) {
    const current = await this.db.comment.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Yorum bulunamadı.');
    return this.db.comment.update({
      where: { id },
      data: {
        ...(input.moderationStatus ? { moderationStatus: input.moderationStatus } : {}),
        ...(input.visibility ? { visibility: input.visibility } : {}),
      },
    });
  }

  private async applyModerationToContent(
    tx: Prisma.TransactionClient,
    type: CommunityContentType,
    id: string,
    action: ModerationActionType,
  ) {
    const visibility =
      action === ModerationActionType.HIDE
        ? CommunityVisibility.HIDDEN
        : action === ModerationActionType.REMOVE
          ? CommunityVisibility.REMOVED
          : action === ModerationActionType.RESTORE || action === ModerationActionType.APPROVE
            ? CommunityVisibility.PUBLIC
            : null;
    const moderation =
      action === ModerationActionType.APPROVE || action === ModerationActionType.RESTORE
        ? ModerationStatus.APPROVED
        : action === ModerationActionType.REJECT
          ? ModerationStatus.REJECTED
          : null;
    if (!visibility && !moderation && action !== ModerationActionType.LOCK) return;
    const data = {
      ...(visibility ? { visibility } : {}),
      ...(moderation ? { moderationStatus: moderation } : {}),
    };
    switch (type) {
      case CommunityContentType.INSPIRATION:
        await tx.concept.update({ where: { id }, data });
        return;
      case CommunityContentType.QUESTION:
        await tx.question.update({ where: { id }, data });
        return;
      case CommunityContentType.DISCUSSION:
        await tx.discussion.update({
          where: { id },
          data: { ...data, ...(action === ModerationActionType.LOCK ? { locked: true } : {}) },
        });
        return;
      case CommunityContentType.EVENT_EXPERIENCE:
        await tx.experience.update({
          where: { id },
          data: {
            ...(visibility ? { visibility } : {}),
            ...(action === ModerationActionType.APPROVE || action === ModerationActionType.RESTORE
              ? { status: ExperienceStatus.APPROVED }
              : action === ModerationActionType.REJECT
                ? { status: ExperienceStatus.REJECTED }
                : {}),
          },
        });
        return;
      case CommunityContentType.POLL:
        await tx.poll.update({ where: { id }, data });
        return;
      default:
        await tx.guide.update({ where: { id }, data });
    }
  }

  async moderationQueue(query: ModerationQueryDto) {
    const where: Prisma.ModerationCaseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.contentType ? { contentType: query.contentType } : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.moderationCase.findMany({
        where,
        include: {
          report: { include: { reporter: { include: { profile: true } } } },
          assignedTo: { include: { profile: true } },
          notes: true,
          actions: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.moderationCase.count({ where }),
    ]);
    const content = await this.resolveContent(
      data.map((entry) => ({ entityType: entry.contentType, entityId: entry.contentId })),
    );
    return {
      data: data.map((entry) => ({
        ...entry,
        content: content.get(`${entry.contentType}:${entry.contentId}`) ?? null,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async moderate(caseId: string, actorId: string, input: ModerationActionDto) {
    const item = await this.db.moderationCase.findUnique({ where: { id: caseId } });
    if (!item) throw new NotFoundException('Moderasyon vakası bulunamadı.');
    return this.db.$transaction(async (tx) => {
      await tx.moderationAction.create({
        data: { caseId, actorId, action: input.action, reason: input.reason ?? null },
      });
      const resolved = new Set<ModerationActionType>([
        ModerationActionType.APPROVE,
        ModerationActionType.REJECT,
        ModerationActionType.REMOVE,
        ModerationActionType.RESTORE,
      ]).has(input.action);
      await this.applyModerationToContent(tx, item.contentType, item.contentId, input.action);
      const updated = await tx.moderationCase.update({
        where: { id: caseId },
        data: {
          assignedToId: actorId,
          status: resolved ? ReportStatus.RESOLVED : ReportStatus.IN_REVIEW,
          resolvedAt: resolved ? new Date() : null,
        },
      });
      if (item.reportId)
        await tx.contentReport.update({
          where: { id: item.reportId },
          data: { status: updated.status },
        });
      return updated;
    });
  }

  async search(query: CommunityListDto) {
    const empty = { concepts: [], experiences: [], questions: [], guides: [], topics: [] };
    if (!query.q) return { data: empty, source: 'none' as const };
    const q = query.q;
    const hitIds = await this.searchIndexIds(q, query.pageSize);
    const idFilter = (type: CommunityContentType) =>
      hitIds ? { id: { in: hitIds.get(type) ?? [] } } : null;
    const like = (fields: string[]) => ({
      OR: fields.map((field) => ({ [field]: { contains: q, mode: 'insensitive' as const } })),
    });
    const [concepts, experiences, questions, guides, topics] = await this.db.$transaction([
      this.db.concept.findMany({
        where: {
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          ...(idFilter(CommunityContentType.INSPIRATION) ??
            like(['title', 'summary', 'description'])),
        },
        include: { category: true },
        orderBy: [{ featured: 'desc' }, { saveCount: 'desc' }],
        take: 12,
      }),
      this.db.experience.findMany({
        where: {
          status: 'APPROVED',
          visibility: 'PUBLIC',
          ...(idFilter(CommunityContentType.EVENT_EXPERIENCE) ??
            like(['title', 'body', 'themeVariation'])),
        },
        include: {
          author: { select: publicAuthorSelect },
          concept: { select: { title: true, slug: true } },
          eventType: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      this.db.question.findMany({
        where: {
          moderationStatus: 'APPROVED',
          visibility: 'PUBLIC',
          ...(idFilter(CommunityContentType.QUESTION) ?? like(['title', 'body'])),
        },
        include: {
          author: { select: publicAuthorSelect },
          concept: { select: { title: true, slug: true } },
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        },
        orderBy: [{ answerCount: 'desc' }, { createdAt: 'desc' }],
        take: 8,
      }),
      this.db.guide.findMany({
        where: {
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
          ...(idFilter(CommunityContentType.GUIDE) ?? like(['title', 'summary', 'body'])),
        },
        take: 6,
      }),
      this.db.topic.findMany({ where: { name: { contains: q, mode: 'insensitive' } }, take: 8 }),
    ]);
    return {
      data: { concepts, experiences, questions, guides, topics },
      source: hitIds ? ('meilisearch' as const) : ('postgres-fallback' as const),
    };
  }

  private async searchIndexIds(q: string, limit: number) {
    try {
      const meiliUrl = process.env.MEILISEARCH_URL ?? 'http://localhost:7700';
      const meiliKey = process.env.MEILISEARCH_MASTER_KEY ?? '';
      const response = await fetch(`${meiliUrl}/indexes/community/search`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(meiliKey ? { authorization: `Bearer ${meiliKey}` } : {}),
        },
        body: JSON.stringify({
          q,
          limit: Math.max(limit * 3, 30),
          filter: 'visibility = PUBLIC AND moderationStatus = APPROVED',
          attributesToRetrieve: ['entityId', 'type'],
        }),
        signal: AbortSignal.timeout(1200),
      });
      if (!response.ok) return null;
      const result = (await response.json()) as {
        hits: Array<{ entityId?: string; type?: string }>;
      };
      if (!result.hits.length) return null;
      const grouped = new Map<CommunityContentType, string[]>();
      for (const hit of result.hits) {
        if (!hit.entityId || !hit.type) continue;
        const type = hit.type as CommunityContentType;
        grouped.set(type, [...(grouped.get(type) ?? []), hit.entityId]);
      }
      return grouped;
    } catch {
      // PostgreSQL fallback keeps search available during index maintenance.
      return null;
    }
  }

  private toFeedItem(
    item: FeedSource,
    type: CommunityContentType,
    href: string,
    text?: string,
    responseCount = 0,
  ): FeedItem {
    const profile = item.author?.profile ?? null;
    return {
      id: item.id,
      type,
      slug: item.slug,
      title: item.title,
      summary: String(text ?? item.summary ?? item.description ?? '').slice(0, 260),
      href,
      imageUrl: item.heroImageUrl ?? null,
      author: profile
        ? {
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }
        : null,
      publishedAt: item.publishedAt ?? item.createdAt,
      featured: item.featured ?? false,
      reactionCount: item.reactionCount ?? 0,
      responseCount,
      saveCount: item.saveCount ?? 0,
    };
  }

  /**
   * Shared indexability gate (`@ilham/seo`): public + approved + non-thin title/body + canonical
   * path + not a duplicate title + not spam-like. Thin or duplicate content stays reachable but
   * `NOINDEX` until an editor promotes it.
   */
  private async decideIndexability(
    model: 'question' | 'discussion' | 'experience',
    title: string,
    body: string,
    slug: string,
    minBody = 120,
  ): Promise<IndexabilityStatus> {
    const normalizedTitle = title.trim().toLocaleLowerCase('tr-TR');
    const table =
      model === 'question'
        ? this.db.question
        : model === 'discussion'
          ? this.db.discussion
          : this.db.experience;
    const duplicate = await (table as typeof this.db.question).findFirst({
      where: { title: { equals: normalizedTitle, mode: 'insensitive' } },
      select: { id: true },
    });
    const links = (body.match(/https?:\/\//gi) ?? []).length;
    const repeated = /(.)\1{7,}/.test(body);
    const verdict = evaluateCommunityIndexability({
      title,
      body: body.length >= minBody ? body : body.slice(0, Math.max(0, minBody - 1)),
      visibility: 'PUBLIC',
      moderationStatus: 'APPROVED',
      canonicalPath: `/${model === 'experience' ? 'deneyim' : model === 'question' ? 'soru' : 'tartisma'}/${slug}`,
      isDuplicate: Boolean(duplicate),
      isSpam: links >= 3 || repeated,
    });
    return verdict.indexable ? IndexabilityStatus.INDEX : IndexabilityStatus.NOINDEX;
  }

  private async uniqueSlug(
    model: 'question' | 'discussion' | 'poll' | 'experience',
    title: string,
  ) {
    const base = this.slugify(title).slice(0, 170) || 'icerik';
    const exists =
      model === 'question'
        ? await this.db.question.findUnique({ where: { slug: base }, select: { id: true } })
        : model === 'discussion'
          ? await this.db.discussion.findUnique({ where: { slug: base }, select: { id: true } })
          : model === 'poll'
            ? await this.db.poll.findUnique({ where: { slug: base }, select: { id: true } })
            : await this.db.experience.findUnique({ where: { slug: base }, select: { id: true } });
    if (!exists) return base;
    return `${base}-${Date.now().toString(36)}`;
  }

  private slugify(value: string) {
    const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
    return value
      .toLocaleLowerCase('tr-TR')
      .replace(/[çğıöşü]/g, (letter) => map[letter] ?? letter)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async attachTopics(
    tx: Prisma.TransactionClient,
    type: CommunityContentType,
    id: string,
    topicIds?: string[],
  ) {
    if (!topicIds?.length) return;
    const count = await tx.topic.count({ where: { id: { in: topicIds } } });
    if (count !== new Set(topicIds).size) throw new BadRequestException('Konu seçimi geçersiz.');
    await tx.contentTopic.createMany({
      data: [...new Set(topicIds)].map((topicId) => ({
        topicId,
        contentType: type,
        contentId: id,
      })),
      skipDuplicates: true,
    });
    await tx.topic.updateMany({
      where: { id: { in: topicIds } },
      data: { contentCount: { increment: 1 } },
    });
  }

  private async assertContentExists(type: CommunityContentType, id: string) {
    const exists =
      type === CommunityContentType.INSPIRATION
        ? await this.db.concept.findUnique({ where: { id }, select: { id: true } })
        : type === CommunityContentType.QUESTION
          ? await this.db.question.findUnique({ where: { id }, select: { id: true } })
          : type === CommunityContentType.DISCUSSION
            ? await this.db.discussion.findUnique({ where: { id }, select: { id: true } })
            : type === CommunityContentType.EVENT_EXPERIENCE
              ? await this.db.experience.findUnique({ where: { id }, select: { id: true } })
              : type === CommunityContentType.POLL
                ? await this.db.poll.findUnique({ where: { id }, select: { id: true } })
                : await this.db.guide.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('İçerik bulunamadı.');
  }

  private updateCounter(
    tx: Prisma.TransactionClient,
    type: CommunityContentType,
    id: string,
    counter: 'reaction' | 'save' | 'comment',
    amount: number,
  ) {
    const field = `${counter}Count`;
    const data = { [field]: { increment: amount } };
    if (type === CommunityContentType.INSPIRATION)
      return tx.concept.update({ where: { id }, data });
    if (type === CommunityContentType.QUESTION)
      return counter === 'comment'
        ? Promise.resolve(null)
        : tx.question.update({ where: { id }, data });
    if (type === CommunityContentType.DISCUSSION)
      return tx.discussion.update({ where: { id }, data });
    if (type === CommunityContentType.EVENT_EXPERIENCE)
      return tx.experience.update({ where: { id }, data });
    if (type === CommunityContentType.POLL) return tx.poll.update({ where: { id }, data });
    return tx.guide.update({ where: { id }, data });
  }
}
