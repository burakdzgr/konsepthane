/**
 * Launch reset: wipes every content / member / audit row, keeps the structural data the site
 * needs to run (roles + permissions, categories, event types, themes, colours, topics, feature
 * flags) and leaves exactly one super-admin account.
 *
 *   ADMIN_EMAIL=admin@konsepthane.net ADMIN_USERNAME=konsepthane ADMIN_PASSWORD='…' pnpm --filter @ilham/database reset:launch
 *
 * Refuses to run unless CONFIRM_RESET=yes so it can never be triggered by accident.
 */
import { hash } from 'bcrypt';
import { PrismaClient, ProfileKind, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_RESET !== 'yes')
    throw new Error('CONFIRM_RESET=yes olmadan çalışmaz (tüm içerik ve üyeler silinir).');
  const email = (process.env.ADMIN_EMAIL ?? 'admin@konsepthane.net').toLocaleLowerCase('tr-TR');
  const username = process.env.ADMIN_USERNAME ?? 'konsepthane';
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Konsepthane';
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 10) throw new Error('ADMIN_PASSWORD en az 10 karakter olmalı.');

  // Dependency-ordered deletes (children first). Taxonomy/RBAC tables are intentionally absent.
  const steps: Array<[string, () => Promise<unknown>]> = [
    ['notifications', () => prisma.notification.deleteMany()],
    ['blog posts', () => prisma.blogPost.deleteMany()],
    ['blog categories', () => prisma.blogCategory.deleteMany()],
    ['audit logs', () => prisma.auditLog.deleteMany()],
    ['moderation actions', () => prisma.moderationAction.deleteMany()],
    ['moderation notes', () => prisma.moderationNote.deleteMany()],
    ['moderation cases', () => prisma.moderationCase.deleteMany()],
    ['content reports', () => prisma.contentReport.deleteMany()],
    ['user sanctions', () => prisma.userSanction.deleteMany()],
    ['leads', () => prisma.lead.deleteMany()],
    ['poll votes', () => prisma.pollVote.deleteMany()],
    ['poll options', () => prisma.pollOption.deleteMany()],
    ['polls', () => prisma.poll.deleteMany()],
    ['comment reactions', () => prisma.commentReaction.deleteMany()],
    ['comments', () => prisma.comment.deleteMany()],
    ['content reactions', () => prisma.contentReaction.deleteMany()],
    ['content saves', () => prisma.contentSave.deleteMany()],
    ['collection items', () => prisma.collectionItem.deleteMany()],
    ['collections', () => prisma.collection.deleteMany()],
    ['question follows', () => prisma.questionFollow.deleteMany()],
    ['answers', () => prisma.answer.deleteMany()],
    ['question images', () => prisma.questionImage.deleteMany()],
    ['questions', () => prisma.question.deleteMany()],
    ['discussion follows', () => prisma.discussionFollow.deleteMany()],
    ['discussions', () => prisma.discussion.deleteMany()],
    ['experience images', () => prisma.experienceImage.deleteMany()],
    ['experiences', () => prisma.experience.deleteMany()],
    ['content topics', () => prisma.contentTopic.deleteMany()],
    ['topic follows', () => prisma.topicFollow.deleteMany()],
    ['user follows', () => prisma.userFollow.deleteMany()],
    ['concept images', () => prisma.conceptImage.deleteMany()],
    ['slug history', () => prisma.slugHistory.deleteMany()],
    ['seo metadata', () => prisma.seoMetadata.deleteMany()],
    ['guides', () => prisma.guide.deleteMany()],
    ['concepts', () => prisma.concept.deleteMany()],
    ['media assets', () => prisma.mediaAsset.deleteMany()],
    ['refresh sessions', () => prisma.refreshSession.deleteMany()],
    ['user roles', () => prisma.userRole.deleteMany()],
    ['profiles', () => prisma.profile.deleteMany()],
    ['users', () => prisma.user.deleteMany()],
  ];
  for (const [label, run] of steps) {
    const result = (await run()) as { count?: number };
    console.log(`  cleared ${label}${typeof result.count === 'number' ? ` (${result.count})` : ''}`);
  }

  // Denormalised counters on the kept taxonomy must not remember deleted content.
  const topics = await prisma.topic.updateMany({ data: { contentCount: 0, followerCount: 0 } });
  console.log(`  reset topic counters (${topics.count})`);

  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'super_admin' } });
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: await hash(password, 12),
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: role.id } },
      profile: {
        create: {
          displayName,
          username,
          kind: ProfileKind.MEMBER,
          isPublic: false,
          editorActive: false,
        },
      },
    },
    select: { id: true, email: true },
  });
  const counts = {
    users: await prisma.user.count(),
    roles: await prisma.role.count(),
    categories: await prisma.category.count(),
    topics: await prisma.topic.count(),
    concepts: await prisma.concept.count(),
    experiences: await prisma.experience.count(),
  };
  console.log('admin', admin, 'remaining', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
