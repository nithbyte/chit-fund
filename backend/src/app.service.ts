import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealthStatus() {
    let databaseStatus = 'DISCONNECTED';
    let databaseResponseTimeMs = -1;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      databaseResponseTimeMs = Date.now() - start;
      databaseStatus = 'CONNECTED';
    } catch {
      databaseStatus = 'ERROR';
    }

    return {
      status: databaseStatus === 'CONNECTED' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      service: 'durga-chit-fund-backend',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: databaseStatus,
        responseTimeMs: databaseResponseTimeMs,
      },
    };
  }
}
