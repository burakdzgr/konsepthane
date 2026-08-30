/**
 * Launch-reset integration test: a completely empty, freshly migrated database must end up with
 * the full RBAC catalogue, the base taxonomy and exactly one super_admin holding every permission.
 * Running it twice must not duplicate anything.
 *
 * Needs a throw-away PostgreSQL database:
 *   TEST_DATABASE_URL=postgresql://user:pass@host:5432/konsepthane_test pnpm --filter @ilham/database test
 * Skipped when TEST_DATABASE_URL is not set (CI without a database still passes).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PERMISSION_KEYS, ROLE_KEYS } from '../src';

const url = process.env.TEST_DATABASE_URL;
const root = path.resolve(__dirname, '..');

function run(args: string[], env: Record<string, string> = {}) {
  return execFileSync('pnpm', ['exec', ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url!, ...env },
    stdio: 'pipe',
    shell: process.platform === 'win32',
  }).toString();
}

const adminEnv = {
  CONFIRM_RESET: 'yes',
  ADMIN_EMAIL: 'admin@konsepthane.net',
  ADMIN_USERNAME: 'konsepthane',
  ADMIN_PASSWORD: 'Test-Parola-1234!',
};

describe.skipIf(!url)('reset:launch on an empty database', () => {
  const prisma = new PrismaClient({ datasources: { db: { url: url ?? '' } } });

  beforeAll(async () => {
    // Start from nothing: drop every table, then apply all migrations.
    // Prepared statements take one command each.
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    run(['prisma', 'migrate', 'deploy']);
    expect(await prisma.role.count()).toBe(0);
    run(['tsx', 'prisma/reset-launch.ts'], adminEnv);
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the whole role/permission catalogue', async () => {
    const roles = await prisma.role.findMany({ select: { key: true } });
    expect(roles.map((r) => r.key).sort()).toEqual([...ROLE_KEYS].sort());
    const permissions = await prisma.permission.findMany({ select: { key: true } });
    expect(permissions.map((p) => p.key).sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('leaves exactly one super_admin holding every permission', async () => {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    expect(users).toHaveLength(1);
    const [admin] = users;
    expect(admin!.email).toBe('admin@konsepthane.net');
    expect(admin!.roles.map((r) => r.role.key)).toEqual(['super_admin']);
    const granted = admin!.roles[0]!.role.permissions.map((rp) => rp.permission.key).sort();
    expect(granted).toEqual([...PERMISSION_KEYS].sort());
  });

  it('creates the base taxonomy without any content', async () => {
    expect(await prisma.category.count()).toBeGreaterThanOrEqual(8);
    expect(await prisma.topic.count()).toBeGreaterThan(0);
    expect(await prisma.concept.count()).toBe(0);
    expect(await prisma.experience.count()).toBe(0);
    expect(await prisma.blogPost.count()).toBe(0);
  });

  it('is idempotent: a second run keeps one admin and no duplicate catalogue rows', async () => {
    run(['tsx', 'prisma/reset-launch.ts'], adminEnv);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.role.count()).toBe(ROLE_KEYS.length);
    expect(await prisma.permission.count()).toBe(PERMISSION_KEYS.length);
    const superAdmin = await prisma.role.findUniqueOrThrow({
      where: { key: 'super_admin' },
      include: { permissions: true },
    });
    expect(superAdmin.permissions).toHaveLength(PERMISSION_KEYS.length);
  }, 120_000);
});
