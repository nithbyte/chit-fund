import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { ChitGroupsService } from './chit-groups.service.js';
import { CreateChitGroupDto } from './dto/create-chit-group.dto.js';
import { EnrollMemberDto } from './dto/enroll-member.dto.js';
import { ActivateChitGroupDto } from './dto/activate-chit-group.dto.js';
import { UpdateCommissionDto } from './dto/update-commission.dto.js';

import { UpdateAuctionModeDto } from './dto/update-auction-mode.dto.js';

@ApiTags('Chit Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chit-groups')
export class ChitGroupsController {
  constructor(private readonly chitGroupsService: ChitGroupsService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Get pre-configured scheme templates (Diwali Weekly, ₹1 Lakh Monthly)' })
  async getTemplates() {
    return this.chitGroupsService.getSchemeTemplates();
  }

  @Get()
  @ApiOperation({ summary: 'List all chit groups with vacancy counts and status' })
  async findAll() {
    return this.chitGroupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chit group details including members, installments, and auctions' })
  @ApiResponse({ status: 200, description: 'Chit group with full schedule' })
  async findOne(@Param('id') id: string) {
    return this.chitGroupsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new chit group and auto-generate installment schedule' })
  @ApiResponse({ status: 201, description: 'Chit group successfully created' })
  async create(
    @Body() createChitGroupDto: CreateChitGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chitGroupsService.create(createChitGroupDto, user?.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Confirm unconfirmed member capacity, start date, and payout rules to activate group' })
  @ApiResponse({ status: 200, description: 'Chit group activated with confirmed schedule' })
  async activate(
    @Param('id') id: string,
    @Body() dto: ActivateChitGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chitGroupsService.activateGroup(id, dto, user?.id);
  }

  @Post(':id/generate-schedule')
  @ApiOperation({ summary: 'Idempotently generate missing installments without duplicating existing records' })
  async generateSchedule(@Param('id') id: string) {
    return this.chitGroupsService.generateSchedule(id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll a customer to a ticket slot in this chit group' })
  async enrollMember(@Param('id') id: string, @Body() enrollMemberDto: EnrollMemberDto) {
    return this.chitGroupsService.enrollMember(id, enrollMemberDto);
  }

  @Patch(':id/commission')
  @ApiOperation({ summary: 'Update and configure commission & earnings terms for this chit group' })
  @ApiResponse({ status: 200, description: 'Commission settings updated and logged' })
  async updateCommission(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chitGroupsService.updateCommission(id, dto, user?.id);
  }

  @Patch(':id/auction-mode')
  @ApiOperation({ summary: 'Configure or update auction calculation mode (Discount-Based or Fixed-Payout) and terms' })
  @ApiResponse({ status: 200, description: 'Auction calculation mode updated' })
  async updateAuctionMode(
    @Param('id') id: string,
    @Body() dto: UpdateAuctionModeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chitGroupsService.updateAuctionMode(id, dto, user?.id);
  }
}
