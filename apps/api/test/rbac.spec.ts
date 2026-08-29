import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_ROLES,
  PERMISSION_KEYS,
  PRIVILEGED_ROLES,
  ROLE_KEYS,
  isRoleKey,
  profileKindForRoles,
  rolePermissions,
} from '@ilham/database';

/**
 * Permission matrix (docs/AUTHORS.md). These are the guarantees the brief asks for:
 * admins manage users/roles, editors write & publish editorial content, members only write UGC.
 */
describe('role → permission matrix', () => {
  it('administrator can manage users and roles', () => {
    const perms = rolePermissions('administrator');
    expect(perms).toContain('user.write');
    expect(perms).toContain('role.manage');
    expect(perms).toContain('concept.publish');
    expect(perms).not.toContain('system.manage');
  });
  it('super_admin has every permission', () => {
    expect([...rolePermissions('super_admin')].sort()).toEqual([...PERMISSION_KEYS].sort());
  });
  it('editor can write and publish editorial content but cannot manage users', () => {
    const perms = rolePermissions('editor');
    expect(perms).toContain('concept.write');
    expect(perms).toContain('concept.publish');
    expect(perms).toContain('category.write');
    expect(perms).not.toContain('user.write');
    expect(perms).not.toContain('role.manage');
    expect(perms).not.toContain('moderation.manage');
  });
  it('member can only take part in the community', () => {
    const perms = rolePermissions('member');
    expect(perms).toContain('community.write');
    expect(perms).not.toContain('concept.write');
    expect(perms).not.toContain('concept.publish');
    expect(perms).not.toContain('user.read');
  });
  it('every catalogued role only yields catalogued permissions', () => {
    for (const role of ROLE_KEYS) {
      for (const permission of rolePermissions(role)) expect(PERMISSION_KEYS).toContain(permission);
    }
  });
  it('knows which roles are editorial / privileged', () => {
    expect(EDITORIAL_ROLES).toEqual(['editor']);
    expect(PRIVILEGED_ROLES).toEqual(['administrator', 'super_admin']);
    expect(isRoleKey('editor')).toBe(true);
    expect(isRoleKey('hacker')).toBe(false);
  });
});

describe('profileKindForRoles', () => {
  it('derives an EDITOR profile only from the editor role', () => {
    expect(profileKindForRoles(['editor'])).toBe('EDITOR');
    expect(profileKindForRoles(['member', 'editor'])).toBe('EDITOR');
    expect(profileKindForRoles(['member'])).toBe('MEMBER');
    expect(profileKindForRoles([])).toBe('MEMBER');
  });
  it('does not turn admins into public editors (no fake Person author)', () => {
    expect(profileKindForRoles(['administrator'])).toBe('MEMBER');
    expect(profileKindForRoles(['super_admin'])).toBe('MEMBER');
  });
});
