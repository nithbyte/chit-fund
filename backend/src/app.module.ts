import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { ChitGroupsModule } from './chit-groups/chit-groups.module.js';
import { CollectionsModule } from './collections/collections.module.js';
import { AuctionsModule } from './auctions/auctions.module.js';
import { PayoutsModule } from './payouts/payouts.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ReconciliationModule } from './reconciliation/reconciliation.module.js';
import { ImportModule } from './import/import.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    CustomersModule,
    ChitGroupsModule,
    CollectionsModule,
    AuctionsModule,
    PayoutsModule,
    ExpensesModule,
    ReportsModule,
    AuditLogsModule,
    DashboardModule,
    SettingsModule,
    ReconciliationModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
