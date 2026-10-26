import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated financial, date-range collections, due today, and overdue stats' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO date string for range start' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO date string for range end' })
  @ApiResponse({ status: 200, description: 'Real-time dashboard metrics' })
  async getSummaryStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getSummaryStats({ startDate, endDate });
  }
}
