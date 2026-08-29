import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { from, switchMap } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Response } from 'express';
import type { AuthenticatedRequest } from './auth.types';
import { DatabaseService } from './database.module';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Writes an intent record before every authenticated mutation. The request body is deliberately
 * excluded so passwords, tokens and editorial drafts can never leak into the audit trail.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || !MUTATION_METHODS.has(request.method)) return next.handle();

    const response = context.switchToHttp().getResponse<Response>();
    const path = request.originalUrl.split('?')[0]?.slice(0, 300) ?? '/';
    const entityType = path.split('/').filter(Boolean)[1]?.slice(0, 80) ?? null;
    const candidateId = request.params.id;
    const entityId =
      typeof candidateId === 'string' && UUID_PATTERN.test(candidateId) ? candidateId : null;
    const requestId = String(response.getHeader('x-request-id') ?? '').slice(0, 100) || null;

    return from(
      this.db.auditLog.create({
        data: {
          actorId: request.user.sub,
          action: `${request.method} ${path}`.slice(0, 120),
          entityType,
          entityId,
          requestId,
          metadata: { method: request.method, path },
        },
      }),
    ).pipe(switchMap(() => next.handle()));
  }
}
