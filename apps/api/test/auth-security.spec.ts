import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { AuditInterceptor } from '../src/common/audit.interceptor';
import { JwtAuthGuard } from '../src/common/auth.guard';
import type { DatabaseService } from '../src/common/database.module';

function httpContext(request: object, response: object = {}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

describe('live session authorization', () => {
  it('rebuilds permissions from the database instead of trusting stale JWT grants', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'old@example.test',
        permissions: ['system.manage'],
      }),
    };
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'current@example.test',
          status: 'ACTIVE',
          roles: [
            {
              role: {
                permissions: [{ permission: { key: 'concept.read' } }],
              },
            },
          ],
        }),
      },
    };
    const request = {
      header: (name: string) => (name === 'authorization' ? 'Bearer signed-token' : undefined),
    } as { header: (name: string) => string | undefined; user?: unknown };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, db as unknown as DatabaseService);

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: '11111111-1111-4111-8111-111111111111',
      email: 'current@example.test',
      permissions: ['concept.read'],
    });
  });

  it('rejects a suspended user even when the access token is still cryptographically valid', async () => {
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'member@example.test',
        permissions: [],
      }),
    };
    const db = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'member@example.test',
          status: 'SUSPENDED',
          roles: [],
        }),
      },
    };
    const request = {
      header: () => 'Bearer signed-token',
    };
    const guard = new JwtAuthGuard(jwt as unknown as JwtService, db as unknown as DatabaseService);

    await expect(guard.canActivate(httpContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('mutation audit boundary', () => {
  it('writes actor, target and path without copying the request body', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'audit-id' });
    const interceptor = new AuditInterceptor({
      auditLog: { create },
    } as unknown as DatabaseService);
    const request = {
      method: 'PATCH',
      originalUrl: '/v1/users/22222222-2222-4222-8222-222222222222?debug=true',
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: { password: 'must-never-be-logged' },
      user: {
        sub: '11111111-1111-4111-8111-111111111111',
        email: 'admin@example.test',
        permissions: ['user.write'],
      },
    };
    const response = { getHeader: () => 'request-123' };
    const handler = { handle: () => of({ ok: true }) } as CallHandler;

    await expect(
      firstValueFrom(interceptor.intercept(httpContext(request, response), handler)),
    ).resolves.toEqual({ ok: true });
    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: '11111111-1111-4111-8111-111111111111',
        action: 'PATCH /v1/users/22222222-2222-4222-8222-222222222222',
        entityType: 'users',
        entityId: '22222222-2222-4222-8222-222222222222',
        requestId: 'request-123',
        metadata: {
          method: 'PATCH',
          path: '/v1/users/22222222-2222-4222-8222-222222222222',
        },
      },
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain('must-never-be-logged');
  });
});
