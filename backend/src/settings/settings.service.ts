import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.setting.findMany();
    const map: Record<string, string> = {
      company_name: 'Durga Chit Fund',
      company_address: 'Plot 12, Main Bazar, Guntur, AP - 522001',
      company_phone: '+91 98480 11223',
      company_proprietor: 'Durga Devi',
      business_timezone: 'Asia/Kolkata',
    };

    settings.forEach((s) => {
      map[s.key] = s.value;
    });

    return map;
  }

  async get(key: string, defaultValue = ''): Promise<string> {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value ?? defaultValue;
  }

  async updateMany(updates: Record<string, string>) {
    const results = [];
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string') {
        const item = await this.prisma.setting.upsert({
          where: { key },
          update: { value: value.trim() },
          create: { key, value: value.trim() },
        });
        results.push(item);
      }
    }
    return this.getAll();
  }
}
