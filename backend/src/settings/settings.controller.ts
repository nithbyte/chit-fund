import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system and company configuration parameters' })
  @ApiResponse({ status: 200, description: 'Settings key-value map' })
  async getAll() {
    return this.settingsService.getAll();
  }

  @Put()
  @ApiOperation({ summary: 'Update company profile or system settings' })
  async update(@Body() updates: Record<string, string>) {
    return this.settingsService.updateMany(updates);
  }
}
