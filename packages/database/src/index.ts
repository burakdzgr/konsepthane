import { PrismaClient } from '@prisma/client';

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export const database =
  globalDatabase.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalDatabase.prisma = database;

export * from '@prisma/client';

// ---------------------------------------------------------------------------
// RBAC catalogue (kept in this single file: the API loads the TS source through Node's type
// stripping, which cannot resolve extension-less relative imports).
// ---------------------------------------------------------------------------
/**
 * Role / permission catalogue — the single source for the seed, the API's guards and the tests.
 *
 * Roles are rows in `roles`, permissions are rows in `permissions`; this module only defines which
 * keys exist and which role is granted which keys. `rolePermissions()` is deterministic so the
 * seed can revoke stale grants and tests can assert the matrix without a database.
 */
export const ROLE_KEYS = [
  'member',
  'contributor',
  'vendor',
  'editor',
  'moderator',
  'seo_manager',
  'administrator',
  'super_admin',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_NAMES: Record<RoleKey, string> = {
  member: 'Üye',
  contributor: 'Katkıda Bulunan',
  vendor: 'Tedarikçi',
  editor: 'Editör',
  moderator: 'Moderatör',
  seo_manager: 'SEO Yöneticisi',
  administrator: 'Yönetici',
  super_admin: 'Süper Yönetici',
};

export const PERMISSION_KEYS = [
  'category.read',
  'category.write',
  'category.publish',
  'concept.read',
  'concept.write',
  'concept.publish',
  'user.read',
  'user.write',
  'role.manage',
  'moderation.manage',
  'seo.manage',
  'media.manage',
  'audit.read',
  'system.manage',
  'community.read',
  'community.write',
  'community.publish',
  'topic.manage',
  'report.read',
  'user.sanction',
  'curation.manage',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Permission grants per role.
 * - `editor`: editorial content (concepts, guides, categories) incl. publishing, plus media.
 *   No user/role management, no moderation of other people's UGC.
 * - `member`: community (UGC) only — experiences, questions, answers, comments, boards.
 * - `administrator`: everything except `system.manage`; `super_admin`: everything.
 */
export function rolePermissions(role: RoleKey): PermissionKey[] {
  return PERMISSION_KEYS.filter((key) => {
    switch (role) {
      case 'super_admin':
        return true;
      case 'administrator':
        return key !== 'system.manage';
      case 'editor':
        return key.startsWith('category.') || key.startsWith('concept.') || key === 'media.manage';
      case 'moderator':
        return key === 'moderation.manage' || key.endsWith('.read');
      case 'seo_manager':
        return key === 'seo.manage' || key.endsWith('.read');
      case 'member':
        return key === 'community.read' || key === 'community.write';
      case 'contributor':
        return key.startsWith('community.') || key === 'concept.write' || key.endsWith('.read');
      default:
        return key.endsWith('.read');
    }
  });
}

/** Roles whose members are public editorial authors (get an `/editor/<slug>` profile). */
export const EDITORIAL_ROLES: readonly RoleKey[] = ['editor'];

/** Roles only an administrator may grant; `role.manage` is required for any change. */
export const PRIVILEGED_ROLES: readonly RoleKey[] = ['administrator', 'super_admin'];

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

/** Profile kind derived from role assignment: editors are public authors, everyone else a member. */
export function profileKindForRoles(roles: readonly string[]): 'EDITOR' | 'MEMBER' {
  return roles.some((role) => (EDITORIAL_ROLES as readonly string[]).includes(role))
    ? 'EDITOR'
    : 'MEMBER';
}
