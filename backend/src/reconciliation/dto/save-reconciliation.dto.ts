import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SaveReconciliationDto {
  @ApiProperty({ example: '2026-10-26', description: 'Reconciliation Date (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 12000, description: 'Physical cash counted in collection pouch / drawer' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualCashCounted?: number;

  @ApiPropertyOptional({ example: 18500, description: 'Actual UPI transactions verified in PhonePe/GPay statement' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualUpiVerified?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Bank credits verified in bank account passbook/netbanking' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualBankVerified?: number;

  @ApiPropertyOptional({ example: 'Cash matches pouch. ₹500 UPI pending bank settlement.', description: 'Reconciliation notes' })
  @IsOptional()
  @IsString()
  discrepancyNote?: string;
}
