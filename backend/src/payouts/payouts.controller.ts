import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PayoutStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { PayoutsService } from './payouts.service.js';
import { RecordPayoutDto } from './dto/record-payout.dto.js';

@ApiTags('Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'List all prize payout vouchers with guarantor and winning member details' })
  @ApiQuery({ name: 'chitGroupId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PayoutStatus })
  async findAll(
    @Query('chitGroupId') chitGroupId?: string,
    @Query('status') status?: PayoutStatus,
  ) {
    return this.payoutsService.findAll(chitGroupId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single payout voucher details' })
  async findOne(@Param('id') id: string) {
    return this.payoutsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Record prize money disbursement voucher with guarantor verification' })
  @ApiResponse({ status: 201, description: 'Payout voucher recorded successfully' })
  async recordPayout(
    @Body() dto: RecordPayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payoutsService.recordPayout(dto, user.id);
  }
}
