import { Injectable } from '@nestjs/common';
import type { Prisma } from '@ilham/database';
import { DatabaseService } from '../common/database.module';
import type { AuditListQueryDto } from './audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async list(query: AuditListQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.q ? { action: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const [data, total] = await this.db.$transaction([
      this.db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.auditLog.count({ where }),
    ]);
    const actorIds = [...new Set(data.flatMap((entry) => (entry.actorId ? [entry.actorId] : [])))];
    const actors = actorIds.length
      ? await this.db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, profile: { select: { displayName: true } } },
        })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    return {
      data: data.map((entry) => ({
        ...entry,
        actor: entry.actorId ? (actorById.get(entry.actorId) ?? null) : null,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }
}
