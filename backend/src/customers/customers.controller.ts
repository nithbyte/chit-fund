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
  @ApiOperation({ summary: 'List all customers with server-side search and pagination' })
  @ApiQuery({ name: 'search', required: false, description: 'Filter by name, phone, or customer code' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.customersService.findAll({ search, page, limit, status });
  }

  @Get('check-duplicate')
  @ApiOperation({ summary: 'Check if matching customer phone or name exists before submission' })
  @ApiQuery({ name: 'phone', required: true })
  @ApiQuery({ name: 'name', required: false })
  async checkDuplicate(
    @Query('phone') phone: string,
    @Query('name') name?: string,
  ) {
    return this.customersService.checkDuplicate(phone, name);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer profile, membership ledger history, and calculated outstanding dues' })
  @ApiResponse({ status: 200, description: 'Customer details with financial summary' })
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer record with duplicate warning verification' })
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
