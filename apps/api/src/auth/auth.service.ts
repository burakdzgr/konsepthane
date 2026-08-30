import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenKind, OAuthProvider, Prisma, UserStatus } from '@ilham/database';
import { compare, hash } from 'bcrypt';
import { DatabaseService } from '../common/database.module';
import { MailService } from '../common/mail.service';
import { GoogleTokenVerifier, type GoogleIdentity } from './google.service';
import { slugifyUsername } from '../users/users.service';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const webUrl = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// Cost-12 sentinel keeps unknown-email and wrong-password paths computationally equivalent.
const INVALID_PASSWORD_HASH = '$2b$12$ADjXShq28DVzwZratbNaMubWYq3pWw4f1XErJfZ4u1NCb0e/yI0o6';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly google: GoogleTokenVerifier,
  ) {}

  /**
   * "Google ile devam et": verifies the ID token server-side, then resolves it to exactly one
   * User in this order — (1) an already linked Google account, (2) an existing account with the
   * same *verified* e-mail (safe link), (3) a brand-new member. Roles are never derived from
   * Google: new users get `member`, existing users keep whatever they had.
   */
  async loginWithGoogle(idToken: string, userAgent?: string, ipAddress?: string) {
    const identity = await this.google.verify(idToken);
    const user = await this.resolveGoogleUser(identity);
    if (user.status !== UserStatus.ACTIVE || user.deletedAt)
      throw new UnauthorizedException({ message: 'Bu hesap kapalı.', code: 'ACCOUNT_DISABLED' });
    const permissions = [
      ...new Set(
        user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
      ),
    ];
    return this.issue(user.id, user.email, permissions, userAgent, ipAddress);
  }

  private readonly userWithRoles = {
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  } as const;

  private async resolveGoogleUser(identity: GoogleIdentity) {
    const linked = await this.db.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: OAuthProvider.GOOGLE,
          providerAccountId: identity.sub,
        },
      },
      include: { user: this.userWithRoles },
    });
    if (linked) {
      // A previously unverified credentials account that later signs in with a verified Google
      // e-mail for the same address is now proven to own the mailbox.
      if (
        linked.user.status === UserStatus.PENDING_VERIFICATION &&
        identity.emailVerified &&
        linked.user.email === identity.email
      )
        return this.db.user.update({
          where: { id: linked.user.id },
          data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
          ...this.userWithRoles,
        });
      return linked.user;
    }
    if (!identity.emailVerified)
      throw new UnauthorizedException({
        message: 'Google hesabının e-postası doğrulanmamış; önce Google tarafında doğrula.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    const existing = await this.db.user.findUnique({
      where: { email: identity.email },
      ...this.userWithRoles,
    });
    try {
      if (existing) {
        if (existing.status === UserStatus.DELETED || existing.deletedAt)
          throw new UnauthorizedException({
            message: 'Bu hesap kapalı.',
            code: 'ACCOUNT_DISABLED',
          });
        // Safe link: same verified e-mail → attach the Google identity to the existing account.
        await this.db.oAuthAccount.create({
          data: {
            userId: existing.id,
            provider: OAuthProvider.GOOGLE,
            providerAccountId: identity.sub,
            email: identity.email,
          },
        });
        if (existing.status === UserStatus.PENDING_VERIFICATION)
          return this.db.user.update({
            where: { id: existing.id },
            data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
            ...this.userWithRoles,
          });
        return existing;
      }
      return await this.createGoogleUser(identity);
    } catch (error) {
      // Two concurrent first sign-ins with the same Google account / e-mail: the unique indexes
      // reject the loser; re-read and continue with the row the winner created.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const retry = await this.db.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: OAuthProvider.GOOGLE,
              providerAccountId: identity.sub,
            },
          },
          include: { user: this.userWithRoles },
        });
        if (retry) return retry.user;
        const byEmail = await this.db.user.findUnique({
          where: { email: identity.email },
          ...this.userWithRoles,
        });
        if (byEmail) return byEmail;
      }
      throw error;
    }
  }

  private async createGoogleUser(identity: GoogleIdentity) {
    const displayName = (identity.name ?? identity.email.split('@')[0] ?? 'Üye')
      .trim()
      .slice(0, 80);
    const base = slugifyUsername(displayName) || 'uye';
    let username = base;
    for (let attempt = 0; await this.db.profile.findUnique({ where: { username } }); attempt += 1)
      username = `${base}-${randomBytes(2).toString('hex')}`.slice(0, 60);
    const memberRole = await this.db.role.findUniqueOrThrow({ where: { key: 'member' } });
    return this.db.user.create({
      data: {
        email: identity.email,
        passwordHash: null,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: memberRole.id } },
        profile: {
          create: {
            displayName,
            username,
            // Google picture is a convenience default; the member can replace it any time and
            // nothing else depends on the Google URL.
            avatarUrl: identity.picture ?? null,
          },
        },
        oauthAccounts: {
          create: {
            provider: OAuthProvider.GOOGLE,
            providerAccountId: identity.sub,
            email: identity.email,
          },
        },
      },
      ...this.userWithRoles,
    });
  }

  /** Linked identity providers + whether a password exists (drives "disconnect" availability). */
  async linkedProviders(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        passwordHash: true,
        email: true,
        oauthAccounts: { select: { provider: true, email: true, createdAt: true } },
      },
    });
    return {
      email: user.email,
      hasPassword: Boolean(user.passwordHash),
      providers: user.oauthAccounts.map((account) => ({
        provider: account.provider,
        email: account.email,
        linkedAt: account.createdAt,
      })),
    };
  }

  /** Disconnects a provider only when another way to sign in remains (password). */
  async unlinkProvider(userId: string, provider: OAuthProvider) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user.passwordHash)
      throw new BadRequestException(
        'Bu hesabın parolası yok; Google bağlantısını kaldırmadan önce bir parola oluştur.',
      );
    await this.db.oAuthAccount.deleteMany({ where: { userId, provider } });
    return { ok: true };
  }

  /** Google-only members get a password through the same one-time link as a reset. */
  async requestPasswordSetup(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, profile: { select: { displayName: true } } },
    });
    const raw = await this.createToken(userId, AuthTokenKind.PASSWORD_RESET, RESET_TTL_MS);
    await this.mail.sendPasswordReset(
      user.email,
      user.profile?.displayName ?? '',
      `${webUrl}/tr/sifre-sifirla?token=${raw}`,
    );
    return { ok: true };
  }

  /**
   * Self-service sign-up: member role, PENDING_VERIFICATION until the mailed link is used.
   * Responds identically whether or not the e-mail already exists (no account enumeration);
   * an existing unverified account simply gets a fresh verification mail.
   */
  async register(input: { email: string; password: string; displayName: string }) {
    const email = input.email.trim().toLocaleLowerCase('tr-TR');
    const existing = await this.db.user.findUnique({
      where: { email },
      include: { profile: { select: { displayName: true } } },
    });
    if (existing) {
      if (existing.status === UserStatus.PENDING_VERIFICATION)
        await this.sendVerification(
          existing.id,
          email,
          existing.profile?.displayName ?? input.displayName,
        );
      return { ok: true };
    }
    const base = slugifyUsername(input.displayName) || 'uye';
    let username = base;
    for (let attempt = 0; await this.db.profile.findUnique({ where: { username } }); attempt += 1)
      username = `${base}-${randomBytes(2).toString('hex')}`.slice(0, 60);
    const memberRole = await this.db.role.findUniqueOrThrow({ where: { key: 'member' } });
    const user = await this.db.user.create({
      data: {
        email,
        passwordHash: await hash(input.password, 12),
        status: UserStatus.PENDING_VERIFICATION,
        roles: { create: { roleId: memberRole.id } },
        profile: { create: { displayName: input.displayName.trim(), username } },
      },
      select: { id: true },
    });
    await this.sendVerification(user.id, email, input.displayName.trim());
    return { ok: true };
  }

  async resendVerification(emailInput: string) {
    const email = emailInput.trim().toLocaleLowerCase('tr-TR');
    const user = await this.db.user.findUnique({
      where: { email },
      include: { profile: { select: { displayName: true } } },
    });
    if (user && user.status === UserStatus.PENDING_VERIFICATION)
      await this.sendVerification(user.id, email, user.profile?.displayName ?? '');
    return { ok: true };
  }

  async verifyEmail(token: string) {
    const record = await this.consumeToken(token, AuthTokenKind.EMAIL_VERIFY);
    await this.db.user.update({
      where: { id: record.userId },
      data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
    });
    return { ok: true };
  }

  /** Always 200: never reveals whether an address is registered. */
  async forgotPassword(emailInput: string) {
    const email = emailInput.trim().toLocaleLowerCase('tr-TR');
    const user = await this.db.user.findUnique({
      where: { email },
      include: { profile: { select: { displayName: true } } },
    });
    if (user && user.status !== UserStatus.DELETED && !user.deletedAt) {
      const raw = await this.createToken(user.id, AuthTokenKind.PASSWORD_RESET, RESET_TTL_MS);
      await this.mail.sendPasswordReset(
        email,
        user.profile?.displayName ?? '',
        `${webUrl}/tr/sifre-sifirla?token=${raw}`,
      );
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const record = await this.consumeToken(token, AuthTokenKind.PASSWORD_RESET);
    await this.db.$transaction([
      this.db.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hash(password, 12),
          // A reset proves control of the mailbox; unverified accounts become active.
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
        },
      }),
      this.db.refreshSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private async sendVerification(userId: string, email: string, displayName: string) {
    const raw = await this.createToken(userId, AuthTokenKind.EMAIL_VERIFY, VERIFY_TTL_MS);
    await this.mail.sendVerification(email, displayName, `${webUrl}/tr/dogrula?token=${raw}`);
  }

  private async createToken(userId: string, kind: AuthTokenKind, ttlMs: number) {
    const raw = randomBytes(32).toString('base64url');
    await this.db.authToken.deleteMany({ where: { userId, kind, usedAt: null } });
    await this.db.authToken.create({
      data: {
        userId,
        kind,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    return raw;
  }

  private async consumeToken(raw: string, kind: AuthTokenKind) {
    if (!raw || raw.length < 20) throw new BadRequestException('Geçersiz bağlantı.');
    const record = await this.db.authToken.findUnique({
      where: { tokenHash: this.hashToken(raw) },
    });
    if (!record || record.kind !== kind || record.usedAt || record.expiresAt <= new Date())
      throw new BadRequestException(
        'Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.',
      );
    await this.db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return record;
  }

  async login(identifier: string, password: string, userAgent?: string, ipAddress?: string) {
    // Members sign in with their e-mail; staff may also use the profile username.
    const handle = identifier.trim();
    const user = await this.db.user.findFirst({
      where: handle.includes('@')
        ? { email: handle.toLocaleLowerCase('tr-TR') }
        : { profile: { username: handle.toLocaleLowerCase('en-US') } },
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    const passwordValid = await compare(password, user?.passwordHash ?? INVALID_PASSWORD_HASH);
    if (user && passwordValid && user.status === UserStatus.PENDING_VERIFICATION)
      throw new UnauthorizedException({
        message: 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    if (!user || user.status !== 'ACTIVE' || !passwordValid) {
      throw new UnauthorizedException('E-posta veya parola hatalı.');
    }
    const permissions = [
      ...new Set(
        user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)),
      ),
    ];
    return this.issue(user.id, user.email, permissions, userAgent, ipAddress);
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = this.hashToken(refreshToken);
    const rotation = await this.db.$transaction(async (tx) => {
      // Serialize all attempts for the same refresh token. A concurrent reuse therefore waits
      // until the replacement session exists, then revokes that replacement in the same commit.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;
      const session = await tx.refreshSession.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: {
              roles: {
                include: { role: { include: { permissions: { include: { permission: true } } } } },
              },
            },
          },
        },
      });
      if (!session || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE')
        return { kind: 'invalid' as const };

      if (session.revokedAt) {
        await tx.refreshSession.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return { kind: 'reused' as const };
      }

      await tx.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
      const nextRefreshToken = randomBytes(48).toString('base64url');
      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: this.hashToken(nextRefreshToken),
          userAgent: userAgent ?? null,
          ipAddress: ipAddress ?? null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      const permissions = [
        ...new Set(
          session.user.roles.flatMap(({ role }) =>
            role.permissions.map(({ permission }) => permission.key),
          ),
        ),
      ];
      return {
        kind: 'rotated' as const,
        userId: session.user.id,
        email: session.user.email,
        permissions,
        refreshToken: nextRefreshToken,
      };
    });

    if (rotation.kind === 'invalid') throw new UnauthorizedException('Yenileme oturumu geçersiz.');
    if (rotation.kind === 'reused')
      throw new UnauthorizedException(
        'Yenileme anahtarı yeniden kullanıldı; tüm oturumlar kapatıldı.',
      );
    const accessToken = await this.jwt.signAsync({
      sub: rotation.userId,
      email: rotation.email,
      permissions: rotation.permissions,
    });
    return {
      accessToken,
      refreshToken: rotation.refreshToken,
      expiresIn: 900,
      user: {
        id: rotation.userId,
        email: rotation.email,
        permissions: rotation.permissions,
      },
    };
  }

  async logout(refreshToken: string) {
    const session = await this.db.refreshSession.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (!session) return { revoked: true };
    if (!session.revokedAt)
      await this.db.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), lastUsedAt: new Date() },
      });
    await this.db.auditLog.create({
      data: { actorId: session.userId, action: 'AUTH_LOGOUT', entityType: 'session' },
    });
    return { revoked: true };
  }

  /**
   * Self-service account deletion (App Store 5.1.1(v) / Play "delete account" requirement).
   * Public content the member authored stays (as on the web, by the terms of use) but is detached
   * from any personal data: e-mail, password, identity links, sessions, saves, follows and
   * notifications are removed or anonymised, the profile becomes a private "Silinmiş üye".
   */
  async deleteAccount(userId: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        roles: { select: { role: { select: { key: true } } } },
      },
    });
    if (user.roles.some(({ role }) => role.key === 'super_admin'))
      throw new BadRequestException(
        'Yönetici hesapları uygulama içinden silinemez; önce yönetici yetkisini devret.',
      );
    const stamp = new Date();
    const tombstoneEmail = `deleted-${user.id}@deleted.konsepthane.invalid`;
    await this.db.$transaction([
      this.db.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: stamp },
      }),
      this.db.authToken.deleteMany({ where: { userId } }),
      this.db.oAuthAccount.deleteMany({ where: { userId } }),
      this.db.contentSave.deleteMany({ where: { userId } }),
      this.db.topicFollow.deleteMany({ where: { userId } }),
      this.db.questionFollow.deleteMany({ where: { userId } }),
      this.db.discussionFollow.deleteMany({ where: { userId } }),
      this.db.userFollow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } }),
      this.db.notification.deleteMany({ where: { userId } }),
      this.db.userRole.deleteMany({ where: { userId } }),
      this.db.profile.updateMany({
        where: { userId },
        data: {
          displayName: 'Silinmiş üye',
          username: null,
          bio: null,
          city: null,
          avatarUrl: null,
          websiteUrl: null,
          longBio: null,
          jobTitle: null,
          expertise: [],
          socialLinks: Prisma.DbNull,
          isPublic: false,
          editorActive: false,
          followerCount: 0,
          followingCount: 0,
        },
      }),
      this.db.user.update({
        where: { id: userId },
        data: {
          email: tombstoneEmail,
          passwordHash: null,
          emailVerifiedAt: null,
          status: UserStatus.DELETED,
          deletedAt: stamp,
        },
      }),
      this.db.auditLog.create({
        data: {
          actorId: userId,
          action: 'AUTH_ACCOUNT_DELETED',
          entityType: 'user',
          entityId: userId,
        },
      }),
    ]);
    return { deleted: true };
  }

  private async issue(
    userId: string,
    email: string,
    permissions: string[],
    userAgent?: string,
    ipAddress?: string,
  ) {
    const refreshToken = randomBytes(48).toString('base64url');
    await this.db.refreshSession.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const accessToken = await this.jwt.signAsync({ sub: userId, email, permissions });
    return { accessToken, refreshToken, expiresIn: 900, user: { id: userId, email, permissions } };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
