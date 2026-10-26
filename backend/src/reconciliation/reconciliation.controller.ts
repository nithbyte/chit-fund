import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { ReconciliationService } from './reconciliation.service.js';
import { SaveReconciliationDto } from './dto/save-reconciliation.dto.js';

@ApiTags('Daily Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Get daily collection register, payment mode totals, and reconciliation status' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (defaults to today)' })
  @ApiResponse({ status: 200, description: 'Daily totals and transactions' })
  async getDailyReport(@Query('date') date?: string) {
    return this.reconciliationService.getDailyReport(date);
  }

  @Post('save')
  @ApiOperation({ summary: 'Save daily physical cash and bank verification record with discrepancy notes' })
  async saveDailyReconciliation(
    @Body() dto: SaveReconciliationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reconciliationService.saveDailyReconciliation(dto, user.id);
  }
}
