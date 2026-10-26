import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PreviewImportDto, ExecuteImportDto } from './dto/import.dto.js';

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROW_COUNT = 2000;

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Neutralize potential CSV formula injection (=, +, -, @, \t, \r)
   */
  sanitizeFormulaInjection(val: string): string {
    if (!val) return '';
    const trimmed = val.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  }

  parseCsv(content: string): { headers: string[]; rows: Record<string, string>[] } {
    if (Buffer.byteLength(content, 'utf8') > MAX_CSV_SIZE_BYTES) {
      throw new BadRequestException('CSV file exceeds maximum allowed size of 5 MB');
    }

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain a header row and at least one data row');
    }

    if (lines.length - 1 > MAX_ROW_COUNT) {
      throw new BadRequestException(`CSV file exceeds maximum row limit of ${MAX_ROW_COUNT} rows`);
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.replace(/^["']|["']$/g, '').trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  async previewImport(dto: PreviewImportDto) {
    const { headers, rows } = this.parseCsv(dto.csvContent);

    // Validate required headers
    const nameKey = headers.find((h) => h.includes('name') || h === 'fullname' || h === 'customer');
    const phoneKey = headers.find((h) => h.includes('phone') || h.includes('mobile') || h === 'contact');
    const addressKey = headers.find((h) => h.includes('address') || h.includes('place') || h === 'city');
    const notesKey = headers.find((h) => h.includes('note') || h.includes('remark'));

    if (!nameKey || !phoneKey) {
      throw new BadRequestException(
        `CSV must contain headers for Customer Name and Mobile Phone (Found: ${headers.join(', ')})`,
      );
    }

    // Fetch all existing customer phones and codes to check duplicates
    const existingCustomers = await this.prisma.customer.findMany({
      select: { customerCode: true, fullName: true, phone: true },
    });
    const phoneMap = new Map(existingCustomers.map((c) => [c.phone, c]));

    const parsedRows = rows.map((r, index) => {
      const rawName = this.sanitizeFormulaInjection(r[nameKey] || '');
      const rawPhone = (r[phoneKey] || '').replace(/\D/g, '');
      const address = addressKey ? this.sanitizeFormulaInjection(r[addressKey] || '') : '';
      const notes = notesKey ? this.sanitizeFormulaInjection(r[notesKey] || '') : '';

      const errors: string[] = [];
      const warnings: string[] = [];

      if (!rawName || rawName.length < 2) {
        errors.push('Full name is required (min 2 characters)');
      }

      if (!rawPhone || !/^[6-9]\d{9}$/.test(rawPhone)) {
        errors.push(`Invalid phone '${r[phoneKey]}'. Must be 10-digit Indian mobile number.`);
      } else {
        const existing = phoneMap.get(rawPhone);
        if (existing) {
          warnings.push(`Matches existing customer in database: ${existing.fullName} (${existing.customerCode})`);
        }
      }

      const status = errors.length > 0 ? 'INVALID' : warnings.length > 0 ? 'WARNING' : 'VALID';

      return {
        rowIndex: index + 1,
        fullName: rawName,
        phone: rawPhone,
        address,
        notes,
        status,
        errors,
        warnings,
      };
    });

    const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
    const warningCount = parsedRows.filter((r) => r.status === 'WARNING').length;
    const invalidCount = parsedRows.filter((r) => r.status === 'INVALID').length;

    return {
      batchType: dto.batchType,
      filename: dto.filename,
      totalRows: parsedRows.length,
      validCount,
      warningCount,
      invalidCount,
      canImport: validCount > 0 || warningCount > 0,
      rows: parsedRows,
    };
  }

  async executeImport(dto: ExecuteImportDto, userId: string) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('No rows provided to import');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create audit import batch record to preserve original file backup
      const importBatch = await tx.importBatch.create({
        data: {
          batchType: dto.batchType,
          filename: dto.filename,
          fileContent: dto.csvContent,
          totalRows: dto.rows.length,
          successRows: 0,
          failedRows: 0,
          status: 'PROCESSING',
          importedById: userId,
        },
      });

      let currentCount = await tx.customer.count();
      let successCount = 0;
      let skippedCount = 0;
      const importedRecords: any[] = [];

      for (const row of dto.rows) {
        if (row.status === 'INVALID') {
          skippedCount++;
          continue;
        }

        currentCount++;
        const customerCode = `CUST-${String(currentCount).padStart(3, '0')}`;

        const cleanName = this.sanitizeFormulaInjection(row.fullName);
        const cleanAddress = this.sanitizeFormulaInjection(row.address || '');
        const cleanNotes = this.sanitizeFormulaInjection(row.notes || '');

        const customer = await tx.customer.create({
          data: {
            customerCode,
            fullName: cleanName,
            phone: row.phone.trim(),
            address: cleanAddress || null,
            notes: cleanNotes ? `[Imported] ${cleanNotes}` : '[Imported from Excel/CSV]',
            identityProofType: 'Aadhaar Card',
            isActive: true,
          },
        });

        successCount++;
        importedRecords.push({
          id: customer.id,
          customerCode: customer.customerCode,
          fullName: customer.fullName,
          phone: customer.phone,
        });
      }

      // Update import batch
      await tx.importBatch.update({
        where: { id: importBatch.id },
        data: {
          successRows: successCount,
          failedRows: skippedCount,
          status: skippedCount === 0 ? 'COMPLETED' : 'PARTIAL',
          summary: {
            importedCount: successCount,
            skippedCount,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          entityType: 'IMPORT',
          entityId: importBatch.id,
          action: 'CSV_IMPORTED',
          performedById: userId,
          metadata: {
            filename: dto.filename,
            successCount,
            skippedCount,
          },
        },
      });

      return {
        batchId: importBatch.id,
        successCount,
        skippedCount,
        importedRecords,
      };
    });
  }

  async getImportHistory() {
    return this.prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        importedBy: {
          select: { fullName: true, username: true },
        },
      },
    });
  }
}
