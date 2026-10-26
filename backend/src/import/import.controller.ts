import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { ImportService } from './import.service.js';
import { PreviewImportDto, ExecuteImportDto } from './dto/import.dto.js';

@ApiTags('Data Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('preview')
  @ApiOperation({ summary: 'Preview CSV rows, validate columns, and detect duplicate customer records' })
  @ApiResponse({ status: 200, description: 'Row-by-row validation preview' })
  async preview(@Body() dto: PreviewImportDto) {
    return this.importService.previewImport(dto);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Import validated records transactionally and preserve original file backup' })
  @ApiResponse({ status: 201, description: 'Transactional import summary' })
  async execute(
    @Body() dto: ExecuteImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.importService.executeImport(dto, user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'View historical import batches and audit logs' })
  async getHistory() {
    return this.importService.getImportHistory();
  }
}
