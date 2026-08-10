import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogQuery {
  entity?: string;
  action?: string;
  take?: number;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  findAll({ entity, action, take = 200 }: AuditLogQuery = {}) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: entity || undefined,
        action: action || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 500),
    });
  }

  /** Distinct entity names present in the log, for the admin filter dropdown. */
  async entities() {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    });
    return rows.map((r) => r.entity);
  }

  /**
   * Writes a log entry without ever failing the request that triggered it —
   * an unrecorded action is far better than a rejected mutation.
   */
  record(entry: {
    action: string;
    entity: string;
    entityId?: string | null;
    actorName: string;
  }) {
    return this.prisma.auditLog
      .create({
        data: {
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          actorName: entry.actorName,
        },
      })
      .catch(() => null);
  }

  async clear() {
    const { count } = await this.prisma.auditLog.deleteMany({});
    return { success: true, count };
  }
}
