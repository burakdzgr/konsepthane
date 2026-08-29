import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PermissionGuard, RequirePermissions } from '../src/common/permissions';

function context(required: string[] | undefined, granted: string[]): ExecutionContext {
  class Handler {}
  const handler = () => undefined;
  if (required) Reflect.defineMetadata(PERMISSIONS_KEY, required, handler);
  return {
    getHandler: () => handler,
    getClass: () => Handler,
    switchToHttp: () => ({ getRequest: () => ({ user: { permissions: granted } }) }),
  } as unknown as ExecutionContext;
}

describe('PermissionGuard', () => {
  const guard = new PermissionGuard(new Reflector());
  it('is constructed as the central policy guard', () => {
    expect(guard).toBeInstanceOf(PermissionGuard);
  });
  it('allows a request that holds every required permission', () => {
    expect(guard.canActivate(context(['concept.write'], ['concept.write', 'concept.read']))).toBe(
      true,
    );
  });
  it('denies a member calling an editorial endpoint', () => {
    expect(() => guard.canActivate(context(['concept.write'], ['community.write']))).toThrow(
      ForbiddenException,
    );
  });
  it('denies an editor calling a user-management endpoint', () => {
    expect(() =>
      guard.canActivate(context(['user.write'], ['concept.write', 'concept.publish'])),
    ).toThrow(ForbiddenException);
  });
  it('requires all listed permissions, not any', () => {
    expect(() =>
      guard.canActivate(context(['concept.write', 'concept.publish'], ['concept.write'])),
    ).toThrow(ForbiddenException);
  });
  it('lets authenticated requests through when no permission is declared', () => {
    expect(guard.canActivate(context(undefined, []))).toBe(true);
  });
  it('RequirePermissions stores its metadata under PERMISSIONS_KEY', () => {
    class Target {
      @RequirePermissions('role.manage')
      run() {
        return true;
      }
    }
    const run = Object.getOwnPropertyDescriptor(Target.prototype, 'run')?.value as object;
    expect(Reflect.getMetadata(PERMISSIONS_KEY, run)).toEqual(['role.manage']);
  });
});
