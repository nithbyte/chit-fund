import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { AuctionsService } from './auctions.service.js';
import { RecordAuctionDto } from './dto/record-auction.dto.js';
import { PreviewAuctionDto } from './dto/preview-auction.dto.js';

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

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview monthly auction calculation results, payout preview, and dividend breakdown before submission' })
  @ApiResponse({ status: 200, description: 'Preview calculation results returned' })
  async previewAuction(@Body() dto: PreviewAuctionDto) {
    return this.auctionsService.previewAuction(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Record auction result, compute commission, member dividend, and adjust installment schedule' })
  @ApiResponse({ status: 201, description: 'Auction result recorded and dividends applied' })
  async recordAuction(
    @Body() dto: RecordAuctionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auctionsService.recordAuction(dto, user.id);
  }
}
