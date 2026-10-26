import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-collection')
  @ApiOperation({ summary: 'Daily collection report with cash, UPI, bank breakdown' })
  @ApiQuery({ name: 'date', required: false })
  async getDailyCollectionReport(@Query('date') date?: string) {
    return this.reportsService.getDailyCollectionReport(date);
  }

  @Get('date-range-collection')
  @ApiOperation({ summary: 'Collection register across custom date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getDateRangeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDateRangeReport(startDate, endDate);
  }

  @Get('customer-outstanding')
  @ApiOperation({ summary: 'All customer outstanding dues, overdue amounts and active chits' })
  async getCustomerOutstandingReport() {
    return this.reportsService.getCustomerOutstandingReport();
  }

  @Get('group-wise')
  @ApiOperation({ summary: 'Chit group collection efficiency and pending dues' })
  async getGroupWiseReport() {
    return this.reportsService.getGroupWiseReport();
  }

  @Get('reversals')
  @ApiOperation({ summary: 'Auditable report of reversed receipts' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getReversalsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getReversalsReport(startDate, endDate);
  }

  @Get('customer-statement/:customerId')
  @ApiOperation({ summary: 'Individual customer statement of account' })
  async getCustomerStatement(@Param('customerId') customerId: string) {
    return this.reportsService.getCustomerStatement(customerId);
  }
}
