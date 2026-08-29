import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PRIVILEGED_ROLES,
  Prisma,
  UserStatus,
  isRoleKey,
  profileKindForRoles,
} from '@ilham/database';
import { hash } from 'bcrypt';
import { DatabaseService } from '../common/database.module';
import type { AccessClaims } from '../common/auth.types';
import type { CreateUserDto, SetRolesDto, UpdateUserDto, UserListQueryDto } from './users.dto';

const userListSelect = {
  id: true,
  email: true,
  status: true,
  createdAt: true,
  deletedAt: true,
  profile: true,
  roles: { select: { role: { select: { key: true, name: true } } } },
  _count: {
    select: { authoredConcepts: true, guides: true, experiences: true, questions: true },
  },
} satisfies Prisma.UserSelect;

/** Turkish-aware slug for usernames derived from display names. */
export function slugifyUsername(value: string) {
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
    .slice(0, 60);
}

/** Role changes are gated: any role other than `member` needs `role.manage`; admin roles need `system.manage`. */
export function assertMayAssignRoles(roles: readonly string[], actor: AccessClaims) {
  for (const role of roles) {
    if (!isRoleKey(role)) throw new BadRequestException(`Bilinmeyen rol: ${role}`);
    if (role !== 'member' && !actor.permissions.includes('role.manage'))
      throw new ForbiddenException('Rol atamak için role.manage yetkisi gerekir.');
    if (
      (PRIVILEGED_ROLES as readonly string[]).includes(role) &&
      !actor.permissions.includes('system.manage')
    )
      throw new ForbiddenException(
        'Yönetici rolleri yalnızca süper yönetici tarafından atanabilir.',
      );
  }
}

/** A profile is a public editor page only when all of these hold. */
export function isPublicEditor(profile: {
  kind: string;
  editorActive: boolean;
  isPublic: boolean;
  username: string | null;
  user?: { status: string } | null;
}) {
  return (
    profile.kind === 'EDITOR' &&
    profile.editorActive &&
    profile.isPublic &&
    Boolean(profile.username) &&
    (profile.user ? profile.user.status === UserStatus.ACTIVE : true)
  );
}

function profileData(input: Partial<CreateUserDto | UpdateUserDto>) {
  const data: Prisma.ProfileUpdateInput = {};
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.username !== undefined) data.username = input.username;
  if (input.bio !== undefined) data.bio = input.bio || null;
  if (input.longBio !== undefined) data.longBio = input.longBio || null;
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle || null;
  if (input.expertise !== undefined)
    data.expertise = input.expertise.map((item) => item.trim()).filter(Boolean);
  if (input.socialLinks !== undefined) {
    const links = Object.fromEntries(
      Object.entries(input.socialLinks).filter(([, url]) => /^https?:\/\//.test(url)),
    );
    data.socialLinks = Object.keys(links).length ? links : Prisma.JsonNull;
  }
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl || null;
  if (input.city !== undefined) data.city = input.city || null;
  if (input.websiteUrl !== undefined) data.websiteUrl = input.websiteUrl || null;
  if (input.isPublic !== undefined) data.isPublic = input.isPublic;
  if (input.editorActive !== undefined) data.editorActive = input.editorActive;
  return data;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: UserListQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { roles: { some: { role: { key: query.role } } } } : {}),
      ...(query.kind ? { profile: { kind: query.kind } } : {}),
      ...(query.q
        ? {
            OR: [
              { email: { contains: query.q, mode: 'insensitive' } },
              { profile: { displayName: { contains: query.q, mode: 'insensitive' } } },
              { profile: { username: { contains: query.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        select: userListSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.user.count({ where }),
    ]);
    return {
      data: data.map((user) => ({ ...user, roles: user.roles.map((entry) => entry.role.key) })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  async get(id: string) {
    const user = await this.db.user.findUnique({ where: { id }, select: userListSelect });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return { ...user, roles: user.roles.map((entry) => entry.role.key) };
  }

  listRoles() {
    return this.db.role.findMany({
      select: { key: true, name: true, description: true, _count: { select: { users: true } } },
      orderBy: { key: 'asc' },
    });
  }

  async listEditorOptions() {
    const data = await this.db.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: { some: { role: { key: 'editor' } } },
        profile: { kind: 'EDITOR', editorActive: true },
      },
      select: {
        id: true,
        profile: { select: { displayName: true, username: true } },
      },
      orderBy: { profile: { displayName: 'asc' } },
      take: 100,
    });
    return { data };
  }

  /**
   * Admin-side user creation (there is no public registration yet). Creates the user AND its
   * profile atomically; a user without a profile cannot be shown as an author anywhere.
   */
  async create(input: CreateUserDto, actor: AccessClaims) {
    const email = input.email.toLocaleLowerCase('tr-TR');
    const roles = [...new Set(input.roles?.length ? input.roles : ['member'])];
    assertMayAssignRoles(roles, actor);
    if (await this.db.user.findUnique({ where: { email } }))
      throw new ConflictException('Bu e-posta zaten kayıtlı.');
    const username = input.username ?? slugifyUsername(input.displayName);
    if (!username) throw new BadRequestException('Kullanıcı adı üretilemedi.');
    if (await this.db.profile.findUnique({ where: { username } }))
      throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    const roleRows = await this.db.role.findMany({ where: { key: { in: roles } } });
    const passwordHash = await hash(input.password, 12);
    const kind = profileKindForRoles(roles);
    const user = await this.db.user.create({
      data: {
        email,
        passwordHash,
        status: input.status ?? UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            ...(profileData(input) as Prisma.ProfileCreateWithoutUserInput),
            displayName: input.displayName,
            username,
            kind,
          },
        },
        roles: { create: roleRows.map((role) => ({ roleId: role.id })) },
      },
      select: userListSelect,
    });
    return { ...user, roles: user.roles.map((entry) => entry.role.key) };
  }

  async update(id: string, input: UpdateUserDto) {
    const current = await this.db.user.findUnique({
      where: { id },
      select: { id: true, profile: true },
    });
    if (!current) throw new NotFoundException('Kullanıcı bulunamadı.');
    if (input.username && input.username !== current.profile?.username) {
      if (await this.db.profile.findUnique({ where: { username: input.username } }))
        throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor.');
    }
    const data: Prisma.UserUpdateInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.password ? { passwordHash: await hash(input.password, 12) } : {}),
    };
    const profile = profileData(input);
    if (Object.keys(profile).length) {
      data.profile = current.profile
        ? { update: profile }
        : {
            create: {
              ...(profile as Prisma.ProfileCreateWithoutUserInput),
              displayName: input.displayName ?? 'Üye',
              username: input.username ?? null,
            },
          };
    }
    const user = await this.db.user.update({ where: { id }, data, select: userListSelect });
    return { ...user, roles: user.roles.map((entry) => entry.role.key) };
  }

  /** Replaces the role set; the profile kind follows (editor role ⇄ public editor profile). */
  async setRoles(id: string, input: SetRolesDto, actor: AccessClaims) {
    const roles = [...new Set(input.roles)];
    assertMayAssignRoles(roles, actor);
    const user = await this.db.user.findUnique({
      where: { id },
      select: { id: true, profile: true },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    const roleRows = await this.db.role.findMany({ where: { key: { in: roles } } });
    await this.db.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleRows.length)
        await tx.userRole.createMany({
          data: roleRows.map((role) => ({ userId: id, roleId: role.id })),
        });
      // Content type stays what it was: past UGC is not turned into editorial content, and an
      // editor's concepts keep their byline even if the role is removed later.
      await tx.profile.update({
        where: { userId: id },
        data: { kind: profileKindForRoles(roles) },
      });
      // Role changes must invalidate sessions so stale permission claims cannot be used.
      await tx.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return this.get(id);
  }

  /**
   * Deletion policy: soft-delete. The user can no longer sign in, roles and sessions are revoked
   * and the editor page disappears, but the profile row (and therefore every byline on published
   * content) is preserved — published articles never end up with an orphan author.
   */
  async softDelete(id: string, actor: AccessClaims) {
    if (id === actor.sub) throw new BadRequestException('Kendi hesabınızı silemezsiniz.');
    const user = await this.db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    await this.db.$transaction([
      this.db.user.update({
        where: { id },
        data: { status: UserStatus.DELETED, deletedAt: new Date() },
      }),
      this.db.userRole.deleteMany({ where: { userId: id } }),
      this.db.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.db.profile.updateMany({
        where: { userId: id },
        data: { editorActive: false, isPublic: false },
      }),
    ]);
    return { id, status: UserStatus.DELETED };
  }

  // ---- public editor pages ------------------------------------------------------------------

  async listEditors() {
    const profiles = await this.db.profile.findMany({
      where: {
        kind: 'EDITOR',
        editorActive: true,
        isPublic: true,
        username: { not: null },
        user: { status: UserStatus.ACTIVE, deletedAt: null },
      },
      select: {
        displayName: true,
        username: true,
        avatarUrl: true,
        jobTitle: true,
        bio: true,
        expertise: true,
        updatedAt: true,
        user: {
          select: {
            _count: {
              select: {
                authoredConcepts: { where: { status: 'PUBLISHED', visibility: 'PUBLIC' } },
                guides: { where: { status: 'PUBLISHED', visibility: 'PUBLIC' } },
              },
            },
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });
    return profiles.map(({ user, ...profile }) => ({
      ...profile,
      conceptCount: user._count.authoredConcepts,
      guideCount: user._count.guides,
    }));
  }

  async getEditor(username: string) {
    const profile = await this.db.profile.findUnique({
      where: { username },
      include: { user: { select: { status: true, deletedAt: true, createdAt: true } } },
    });
    if (!profile || !isPublicEditor(profile) || profile.user.deletedAt)
      throw new NotFoundException('Editör bulunamadı.');
    const [concepts, guides] = await this.db.$transaction([
      this.db.concept.findMany({
        where: { authorId: profile.userId, status: 'PUBLISHED', visibility: 'PUBLIC' },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          heroImageUrl: true,
          heroImageAlt: true,
          publishedAt: true,
          updatedAt: true,
          category: { select: { name: true, slug: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      }),
      this.db.guide.findMany({
        where: {
          authorId: profile.userId,
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          moderationStatus: 'APPROVED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          publishedAt: true,
          updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      }),
    ]);
    const { user, ...rest } = profile;
    const publicProfile: Omit<typeof rest, 'userId' | 'id'> & { userId?: string; id?: string } = {
      ...rest,
    };
    delete publicProfile.userId;
    delete publicProfile.id;
    const lastPublishedAt =
      [...concepts, ...guides]
        .map((item) => item.publishedAt ?? item.updatedAt)
        .sort()
        .at(-1) ?? null;
    return { ...publicProfile, memberSince: user.createdAt, concepts, guides, lastPublishedAt };
  }
}
