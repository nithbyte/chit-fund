import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ChitGroupsService } from './chit-groups.service.js';
import { CreateChitGroupDto } from './dto/create-chit-group.dto.js';
import { EnrollMemberDto } from './dto/enroll-member.dto.js';

@ApiTags('Chit Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chit-groups')
export class ChitGroupsController {
  constructor(private readonly chitGroupsService: ChitGroupsService) {}

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
  async create(@Body() createChitGroupDto: CreateChitGroupDto) {
    return this.chitGroupsService.create(createChitGroupDto);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll a customer to a ticket slot in this chit group' })
  async enrollMember(@Param('id') id: string, @Body() enrollMemberDto: EnrollMemberDto) {
    return this.chitGroupsService.enrollMember(id, enrollMemberDto);
  }
}
