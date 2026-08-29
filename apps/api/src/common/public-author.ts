import type { Prisma } from '@ilham/database';

/**
 * The only shape in which an author leaves the API on public endpoints. Never `include: { profile
 * true }` on a User relation in a public query: that serialises the whole `users` row (email,
 * password hash, status).
 */
export const publicAuthorSelect = {
  id: true,
  profile: {
    select: {
      displayName: true,
      username: true,
      avatarUrl: true,
      kind: true,
      jobTitle: true,
      editorActive: true,
      isPublic: true,
    },
  },
} satisfies Prisma.UserSelect;

export type PublicAuthor = Prisma.UserGetPayload<{ select: typeof publicAuthorSelect }>;
