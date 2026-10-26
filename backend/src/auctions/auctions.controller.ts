import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { AuctionsService } from './auctions.service.js';
import { RecordAuctionDto } from './dto/record-auction.dto.js';

@ApiTags('Auctions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all auction records with winning member and dividend figures' })
  @ApiQuery({ name: 'chitGroupId', required: false })
  async findAll(@Query('chitGroupId') chitGroupId?: string) {
    return this.auctionsService.findAll(chitGroupId);
  }

  @Post()
  @ApiOperation({ summary: 'Record auction result, compute 5% commission, member dividend, and adjust installment schedule' })
  @ApiResponse({ status: 201, description: 'Auction result recorded and dividends applied' })
  async recordAuction(
    @Body() dto: RecordAuctionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auctionsService.recordAuction(dto, user.id);
  }
}
