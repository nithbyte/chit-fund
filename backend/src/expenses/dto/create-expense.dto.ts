import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMode } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ description: 'Expense title / purpose (e.g. Office Rent, Stationery, Tea & Snacks)' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Category (e.g. RENT, TEA_SNACKS, PRINTING_STATIONERY, UTILITIES, TRAVEL, OTHER)' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ description: 'Amount in INR' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ description: 'Expense date' })
  @IsOptional()
  expenseDate?: string;

  @ApiProperty({ enum: PaymentMode, default: PaymentMode.CASH })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ description: 'Voucher number, receipt # or UPI ref' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ description: 'Additional details or notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
