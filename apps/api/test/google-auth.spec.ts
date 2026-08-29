/* eslint-disable @typescript-eslint/require-await -- in-memory Prisma stand-ins are declared async to match the client's return types */
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { Prisma } from '@ilham/database';
import { AuthService } from '../src/auth/auth.service';
import type { GoogleIdentity, GoogleTokenVerifier } from '../src/auth/google.service';
import type { DatabaseService } from '../src/common/database.module';
import type { MailService } from '../src/common/mail.service';

/**
 * In-memory stand-in for the handful of Prisma calls the Google flow touches. Keeps the same
 * unique constraints as the schema so race/duplicate behaviour is exercised for real.
 */
function fakeDb() {
  const users: Array<{
    id: string;
    email: string;
    passwordHash: string | null;
    status: string;
    deletedAt: Date | null;
    emailVerifiedAt: Date | null;
    roles: Array<{ role: { key: string; permissions: Array<{ permission: { key: string } }> } }>;
  }> = [];
  const accounts: Array<{
    userId: string;
    provider: string;
    providerAccountId: string;
    email: string | null;
  }> = [];
  const profiles: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }> = [];
  const sessions: unknown[] = [];
  const roleRows = {
    member: {
      id: 'r-member',
      key: 'member',
      permissions: [{ permission: { key: 'community.write' } }],
    },
    editor: {
      id: 'r-editor',
      key: 'editor',
      permissions: [{ permission: { key: 'concept.write' } }],
    },
    administrator: {
      id: 'r-admin',
      key: 'administrator',
      permissions: [{ permission: { key: 'user.write' } }],
    },
  };
  const withRoles = (u: (typeof users)[number] | undefined) => (u ? { ...u } : null);
  let seq = 0;
  const db = {
    _users: users,
    _accounts: accounts,
    _profiles: profiles,
    _sessions: sessions,
    seedUser(email: string, opts: Partial<(typeof users)[number]> & { roleKeys?: string[] } = {}) {
      const id = `u-${++seq}`;
      const roles = (opts.roleKeys ?? ['member']).map((key) => ({
        role: roleRows[key as keyof typeof roleRows],
      }));
      users.push({
        id,
        email,
        passwordHash: 'hash',
        status: 'ACTIVE',
        deletedAt: null,
        emailVerifiedAt: new Date(),
        ...opts,
        roles,
      });
      profiles.push({
        userId: id,
        username: email.split('@')[0]!,
        displayName: 'Existing',
        avatarUrl: null,
      });
      return id;
    },
    oAuthAccount: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { provider_providerAccountId: { provider: string; providerAccountId: string } };
        }) => {
          const key = where.provider_providerAccountId;
          const acc = accounts.find(
            (a) => a.provider === key.provider && a.providerAccountId === key.providerAccountId,
          );
          return acc ? { ...acc, user: withRoles(users.find((u) => u.id === acc.userId)) } : null;
        },
      ),
      create: vi.fn(async ({ data }: { data: (typeof accounts)[number] }) => {
        if (
          accounts.some(
            (a) => a.provider === data.provider && a.providerAccountId === data.providerAccountId,
          )
        )
          throw new Prisma.PrismaClientKnownRequestError('dup', {
            code: 'P2002',
            clientVersion: 'test',
          });
        accounts.push({ ...data });
        return data;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { userId: string; provider: string } }) => {
        const before = accounts.length;
        for (let i = accounts.length - 1; i >= 0; i--)
          if (accounts[i]!.userId === where.userId && accounts[i]!.provider === where.provider)
            accounts.splice(i, 1);
        return { count: before - accounts.length };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
        withRoles(users.find((u) => (where.email ? u.email === where.email : u.id === where.id))),
      ),
      findUniqueOrThrow: vi.fn(
        async ({ where, select }: { where: { id: string }; select?: Record<string, unknown> }) => {
          const u = users.find((x) => x.id === where.id);
          if (!u) throw new Error('not found');
          if (select?.oauthAccounts)
            return {
              ...u,
              oauthAccounts: accounts
                .filter((a) => a.userId === u.id)
                .map((a) => ({ ...a, createdAt: new Date() })),
            };
          return { ...u, profile: profiles.find((p) => p.userId === u.id) };
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<(typeof users)[number]>;
        }) => {
          const u = users.find((x) => x.id === where.id)!;
          Object.assign(u, data);
          return withRoles(u);
        },
      ),
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            email: string;
            passwordHash: string | null;
            status: string;
            emailVerifiedAt: Date;
            roles: { create: { roleId: string } };
            profile: {
              create: { displayName: string; username: string; avatarUrl: string | null };
            };
            oauthAccounts: {
              create: { provider: string; providerAccountId: string; email: string };
            };
          };
        }) => {
          if (
            users.some((u) => u.email === data.email) ||
            accounts.some(
              (a) => a.providerAccountId === data.oauthAccounts.create.providerAccountId,
            )
          )
            throw new Prisma.PrismaClientKnownRequestError('dup', {
              code: 'P2002',
              clientVersion: 'test',
            });
          const id = `u-${++seq}`;
          const role = Object.values(roleRows).find((r) => r.id === data.roles.create.roleId)!;
          const user = {
            id,
            email: data.email,
            passwordHash: data.passwordHash,
            status: data.status,
            deletedAt: null,
            emailVerifiedAt: data.emailVerifiedAt,
            roles: [{ role }],
          };
          users.push(user);
          profiles.push({ userId: id, ...data.profile.create });
          accounts.push({ userId: id, ...data.oauthAccounts.create });
          return withRoles(user);
        },
      ),
    },
    profile: {
      findUnique: vi.fn(
        async ({ where }: { where: { username: string } }) =>
          profiles.find((p) => p.username === where.username) ?? null,
      ),
    },
    role: {
      findUniqueOrThrow: vi.fn(
        async ({ where }: { where: { key: string } }) =>
          roleRows[where.key as keyof typeof roleRows],
      ),
    },
    refreshSession: {
      create: vi.fn(async ({ data }: { data: unknown }) => {
        sessions.push(data);
        return data;
      }),
    },
    authToken: { deleteMany: vi.fn(async () => ({ count: 0 })), create: vi.fn(async () => ({})) },
  };
  return db;
}

const identity = (over: Partial<GoogleIdentity> = {}): GoogleIdentity => ({
  sub: 'google-sub-1',
  email: 'burak@example.test',
  emailVerified: true,
  name: 'Burak Örnek',
  picture: 'https://lh3.googleusercontent.com/a/photo',
  audience: 'web-client-id',
  ...over,
});

function makeService(
  db: ReturnType<typeof fakeDb>,
  verify: (token: string) => Promise<GoogleIdentity>,
) {
  const jwt = {
    signAsync: vi.fn(async (claims: object) => `jwt:${JSON.stringify(claims)}`),
  } as unknown as JwtService;
  const mail = {
    sendPasswordReset: vi.fn(async () => true),
    sendVerification: vi.fn(async () => true),
  } as unknown as MailService;
  const google = { verify: vi.fn(verify), configured: true } as unknown as GoogleTokenVerifier;
  return {
    service: new AuthService(db as unknown as DatabaseService, jwt, mail, google),
    mail,
    google,
  };
}

describe('Google sign-in', () => {
  let db: ReturnType<typeof fakeDb>;
  beforeEach(() => {
    db = fakeDb();
  });

  it('creates a new USER + profile for a first-time verified Google identity', async () => {
    const { service } = makeService(db, async () => identity());
    const result = await service.loginWithGoogle('token');
    expect(db._users).toHaveLength(1);
    expect(db._users[0]).toMatchObject({
      email: 'burak@example.test',
      status: 'ACTIVE',
      passwordHash: null,
    });
    expect(db._users[0]!.emailVerifiedAt).toBeInstanceOf(Date);
    expect(db._profiles[0]).toMatchObject({
      username: 'burak-ornek',
      displayName: 'Burak Örnek',
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
    });
    expect(db._accounts[0]).toMatchObject({
      provider: 'GOOGLE',
      providerAccountId: 'google-sub-1',
    });
    expect(result.user.permissions).toEqual(['community.write']);
    expect(result.user.permissions).not.toContain('concept.write');
    expect(result.refreshToken.length).toBeGreaterThan(40);
  });

  it('links to an existing credentials account with the same verified e-mail — no second user', async () => {
    const existingId = db.seedUser('burak@example.test');
    const { service } = makeService(db, async () => identity());
    const result = await service.loginWithGoogle('token');
    expect(db._users).toHaveLength(1);
    expect(result.user.id).toBe(existingId);
    expect(db._accounts).toEqual([
      {
        userId: existingId,
        provider: 'GOOGLE',
        providerAccountId: 'google-sub-1',
        email: 'burak@example.test',
      },
    ]);
  });

  it('does not create duplicates on repeated Google logins', async () => {
    const { service } = makeService(db, async () => identity());
    const first = await service.loginWithGoogle('token');
    const second = await service.loginWithGoogle('token');
    expect(db._users).toHaveLength(1);
    expect(db._accounts).toHaveLength(1);
    expect(second.user.id).toBe(first.user.id);
  });

  it('a different Google account is a different user', async () => {
    const { service } = makeService(db, async (token) =>
      identity({ sub: `sub-${token}`, email: `${token}@example.test` }),
    );
    await service.loginWithGoogle('a');
    await service.loginWithGoogle('b');
    expect(db._users).toHaveLength(2);
  });

  it('never merges on an unverified Google e-mail (account-takeover guard)', async () => {
    db.seedUser('burak@example.test');
    const { service } = makeService(db, async () => identity({ emailVerified: false }));
    await expect(service.loginWithGoogle('token')).rejects.toThrow(UnauthorizedException);
    expect(db._accounts).toHaveLength(0);
    expect(db._users).toHaveLength(1);
  });

  it('keeps EDITOR / ADMIN roles when those accounts link Google, and never grants them to new users', async () => {
    db.seedUser('editor@example.test', { roleKeys: ['editor'] });
    db.seedUser('admin@example.test', { roleKeys: ['administrator'] });
    const { service } = makeService(db, async (token) =>
      identity({ sub: `sub-${token}`, email: `${token}@example.test` }),
    );
    expect((await service.loginWithGoogle('editor')).user.permissions).toEqual(['concept.write']);
    expect((await service.loginWithGoogle('admin')).user.permissions).toEqual(['user.write']);
    expect((await service.loginWithGoogle('fresh')).user.permissions).toEqual(['community.write']);
  });

  it('activates a pending (unverified) credentials account when Google verifies the same e-mail', async () => {
    const id = db.seedUser('burak@example.test', {
      status: 'PENDING_VERIFICATION',
      emailVerifiedAt: null,
    });
    const { service } = makeService(db, async () => identity());
    const result = await service.loginWithGoogle('token');
    expect(result.user.id).toBe(id);
    expect(db._users[0]!.status).toBe('ACTIVE');
  });

  it('rejects disabled (suspended / deleted) users even with a valid Google token', async () => {
    db.seedUser('burak@example.test', { status: 'SUSPENDED' });
    const { service } = makeService(db, async () => identity());
    await expect(service.loginWithGoogle('token')).rejects.toThrow(/kapalı/);
    db._users[0]!.status = 'DELETED';
    db._users[0]!.deletedAt = new Date();
    await expect(service.loginWithGoogle('token')).rejects.toThrow(/kapalı/);
    expect(db._sessions).toHaveLength(0);
  });

  it('rejects invalid / expired / wrong-audience tokens before touching the database', async () => {
    const { service } = makeService(db, async () => {
      throw new UnauthorizedException('Google kimliği doğrulanamadı.');
    });
    await expect(service.loginWithGoogle('bad')).rejects.toThrow(UnauthorizedException);
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db._users).toHaveLength(0);
  });

  it('survives a concurrent first sign-in race (unique violation → re-read winner)', async () => {
    const { service } = makeService(db, async () => identity());
    // Simulate the loser: the account row appears between the lookup and the create.
    db.oAuthAccount.findUnique.mockImplementationOnce(async () => null);
    const originalCreate = db.user.create.getMockImplementation()!;
    db.user.create.mockImplementationOnce(async (args: Parameters<typeof originalCreate>[0]) => {
      await originalCreate(args); // winner inserted…
      throw new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }); // …loser fails
    });
    const result = await service.loginWithGoogle('token');
    expect(db._users).toHaveLength(1);
    expect(result.user.id).toBe(db._users[0]!.id);
  });

  it('lists linked providers and only allows unlinking when a password exists', async () => {
    const { service } = makeService(db, async () => identity());
    const login = await service.loginWithGoogle('token');
    const state = await service.linkedProviders(login.user.id);
    expect(state.hasPassword).toBe(false);
    expect(state.providers.map((p) => p.provider)).toEqual(['GOOGLE']);
    await expect(service.unlinkProvider(login.user.id, 'GOOGLE')).rejects.toThrow(/parola/);
    db._users[0]!.passwordHash = 'hash';
    await expect(service.unlinkProvider(login.user.id, 'GOOGLE')).resolves.toEqual({ ok: true });
    expect(db._accounts).toHaveLength(0);
  });
});

describe('GoogleTokenVerifier', () => {
  it('refuses to run without configured client ids and rejects foreign issuers/audiences', async () => {
    const { GoogleTokenVerifier: Verifier } = await import('../src/auth/google.service');
    delete process.env.GOOGLE_CLIENT_IDS;
    delete process.env.GOOGLE_CLIENT_ID;
    const unconfigured = new Verifier();
    expect(unconfigured.configured).toBe(false);
    await expect(unconfigured.verify('x')).rejects.toThrow(UnauthorizedException);

    process.env.GOOGLE_CLIENT_IDS = 'web-client-id,android-client-id';
    const verifier = new Verifier();
    const client = (verifier as unknown as { client: { verifyIdToken: unknown } }).client;
    client.verifyIdToken = vi.fn(async () => ({
      getPayload: () => ({
        sub: 's',
        iss: 'https://evil.example',
        aud: 'web-client-id',
        email: 'a@b.c',
        email_verified: true,
      }),
    }));
    await expect(verifier.verify('t')).rejects.toThrow(/doğrulanamadı/);
    client.verifyIdToken = vi.fn(async () => ({
      getPayload: () => ({
        sub: 's',
        iss: 'https://accounts.google.com',
        aud: 'other-app',
        email: 'a@b.c',
        email_verified: true,
      }),
    }));
    await expect(verifier.verify('t')).rejects.toThrow(/bu uygulama/);
    client.verifyIdToken = vi.fn(async () => {
      throw new Error('Token used too late');
    });
    await expect(verifier.verify('t')).rejects.toThrow(/doğrulanamadı/);
    client.verifyIdToken = vi.fn(async () => ({
      getPayload: () => ({
        sub: 's',
        iss: 'accounts.google.com',
        aud: 'android-client-id',
        email: 'A@B.c',
        email_verified: true,
        name: 'N',
      }),
    }));
    await expect(verifier.verify('t')).resolves.toMatchObject({
      sub: 's',
      email: 'a@b.c',
      emailVerified: true,
      audience: 'android-client-id',
    });
  });
});
