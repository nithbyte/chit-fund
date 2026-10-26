import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query?.entityType && query.entityType !== 'ALL') {
      where.entityType = query.entityType;
    }
    if (query?.action && query.action !== 'ALL') {
      where.action = query.action;
    }
    if (query?.startDate || query?.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = new Date(query.startDate);
      if (query.endDate) where.timestamp.lte = new Date(query.endDate);
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 50;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: {
          performedBy: {
            select: { id: true, fullName: true, username: true },
          },
        },
      }),
    ]);

    return {
      items: logs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        entityId: l.entityId,
        action: l.action,
        performedBy: l.performedBy.fullName,
        metadata: l.metadata,
        timestamp: l.timestamp,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
