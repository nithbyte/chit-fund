import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentMode } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CollectionsService } from './collections.service.js';
import { RecordCollectionDto } from './dto/record-collection.dto.js';
import { ReverseCollectionDto } from './dto/reverse-collection.dto.js';

@ApiTags('Collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List manual collection receipts with registers and totals' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'paymentMode', required: false, enum: PaymentMode })
  @ApiQuery({ name: 'receiptNumber', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentMode') paymentMode?: PaymentMode,
    @Query('receiptNumber') receiptNumber?: string,
    @Query('search') search?: string,
  ) {
    return this.collectionsService.findAll({
      customerId,
      startDate,
      endDate,
      paymentMode,
      receiptNumber,
      search,
    });
  }

  @Get('customer/:customerId/dues')
  @ApiOperation({ summary: 'Get outstanding installment dues and recent payment for customer memberships' })
  @ApiQuery({ name: 'membershipId', required: false, description: 'Optional specific chit membership filter' })
  async getCustomerPendingDues(
    @Param('customerId') customerId: string,
    @Query('membershipId') membershipId?: string,
  ) {
    return this.collectionsService.getCustomerPendingDues(customerId, membershipId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single receipt details for viewing or printing' })
  @ApiResponse({ status: 200, description: 'Receipt details with allocations' })
  async findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Record manual collection (Cash, UPI, Bank Transfer) with multi-installment allocations and idempotency protection' })
  @ApiResponse({ status: 201, description: 'Collection successfully recorded and receipt generated' })
  async recordCollection(
    @Body() recordDto: RecordCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.recordCollection(recordDto, user.id);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a mistakenly entered payment receipt with mandatory reason (never deleted)' })
  async reversePayment(
    @Param('id') id: string,
    @Body() reverseDto: ReverseCollectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.collectionsService.reversePayment(id, reverseDto, user.id);
  }
}
