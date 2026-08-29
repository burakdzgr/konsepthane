import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ContentStatus } from '@ilham/database';
import { assertCanPublish, resolveEditorialAuthor } from '../src/common/editorial';
import { assertMayAssignRoles, isPublicEditor, slugifyUsername } from '../src/users/users.service';
import type { AccessClaims } from '../src/common/auth.types';
import type { DatabaseService } from '../src/common/database.module';

const claims = (permissions: string[], sub = 'actor'): AccessClaims => ({
  sub,
  email: `${sub}@example.test`,
  permissions,
});
const editor = claims(['concept.read', 'concept.write', 'concept.publish'], 'editor-1');
const member = claims(['community.read', 'community.write'], 'member-1');
const admin = claims(['user.write', 'role.manage', 'concept.publish'], 'admin-1');
const superAdmin = claims(['user.write', 'role.manage', 'system.manage'], 'root');

function fakeDb(profiles: Record<string, { kind: string; status: string }>) {
  return {
    profile: {
      findUnique: ({ where }: { where: { userId: string } }) => {
        const row = profiles[where.userId];
        return Promise.resolve(row ? { kind: row.kind, user: { status: row.status } } : null);
      },
    },
  } as unknown as DatabaseService;
}

describe('assertCanPublish', () => {
  it('lets an editor publish', () => {
    expect(() => assertCanPublish(ContentStatus.PUBLISHED, editor)).not.toThrow();
  });
  it('blocks publishing without concept.publish', () => {
    expect(() => assertCanPublish(ContentStatus.PUBLISHED, member)).toThrow(ForbiddenException);
    expect(() => assertCanPublish(ContentStatus.PUBLISHED, claims(['concept.write']))).toThrow(
      ForbiddenException,
    );
  });
  it('does not care about non-published statuses', () => {
    expect(() => assertCanPublish(ContentStatus.DRAFT, member)).not.toThrow();
    expect(() => assertCanPublish(undefined, member)).not.toThrow();
  });
});

describe('resolveEditorialAuthor', () => {
  const db = fakeDb({
    'editor-1': { kind: 'EDITOR', status: 'ACTIVE' },
    'editor-off': { kind: 'EDITOR', status: 'SUSPENDED' },
    'admin-1': { kind: 'MEMBER', status: 'ACTIVE' },
  });
  it('defaults the byline to the acting editor', async () => {
    await expect(resolveEditorialAuthor(db, undefined, editor)).resolves.toBe('editor-1');
  });
  it('leaves the byline empty for an admin without editor profile (organisation author)', async () => {
    await expect(resolveEditorialAuthor(db, undefined, admin)).resolves.toBeNull();
  });
  it('accepts an explicit active editor', async () => {
    await expect(resolveEditorialAuthor(db, 'editor-1', admin)).resolves.toBe('editor-1');
  });
  it('rejects members, suspended editors and unknown ids as byline', async () => {
    await expect(resolveEditorialAuthor(db, 'admin-1', admin)).rejects.toThrow(BadRequestException);
    await expect(resolveEditorialAuthor(db, 'editor-off', admin)).rejects.toThrow(
      BadRequestException,
    );
    await expect(resolveEditorialAuthor(db, 'nobody', admin)).rejects.toThrow(BadRequestException);
  });
});

describe('assertMayAssignRoles', () => {
  it('admin can create editors', () => {
    expect(() => assertMayAssignRoles(['editor'], admin)).not.toThrow();
  });
  it('member/editor cannot assign non-member roles', () => {
    expect(() => assertMayAssignRoles(['editor'], member)).toThrow(ForbiddenException);
    expect(() => assertMayAssignRoles(['editor'], editor)).toThrow(ForbiddenException);
    expect(() => assertMayAssignRoles(['member'], member)).not.toThrow();
  });
  it('only super_admin can hand out administrator roles', () => {
    expect(() => assertMayAssignRoles(['administrator'], admin)).toThrow(ForbiddenException);
    expect(() => assertMayAssignRoles(['administrator'], superAdmin)).not.toThrow();
  });
  it('rejects unknown roles', () => {
    expect(() => assertMayAssignRoles(['owner'], superAdmin)).toThrow(BadRequestException);
  });
});

describe('isPublicEditor', () => {
  const base = { kind: 'EDITOR', editorActive: true, isPublic: true, username: 'ayse' };
  it('is true only for active, public editors with a slug and an active account', () => {
    expect(isPublicEditor({ ...base, user: { status: 'ACTIVE' } })).toBe(true);
    expect(isPublicEditor({ ...base, kind: 'MEMBER' })).toBe(false);
    expect(isPublicEditor({ ...base, editorActive: false })).toBe(false);
    expect(isPublicEditor({ ...base, isPublic: false })).toBe(false);
    expect(isPublicEditor({ ...base, username: null })).toBe(false);
    expect(isPublicEditor({ ...base, user: { status: 'DELETED' } })).toBe(false);
  });
});

describe('slugifyUsername', () => {
  it('produces url-safe editor slugs from Turkish names', () => {
    expect(slugifyUsername('Ayşe Öztürk')).toBe('ayse-ozturk');
    expect(slugifyUsername('  Çağrı  ')).toBe('cagri');
  });
});
