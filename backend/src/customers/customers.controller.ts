import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers with optional search filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by name, phone, or customer code' })
  async findAll(@Query('search') search?: string) {
    return this.customersService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer profile, active chit memberships, and dues summary' })
  @ApiResponse({ status: 200, description: 'Customer details with financial summary' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer record' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer details' })
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }
}
