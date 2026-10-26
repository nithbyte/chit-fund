import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class AllocationItemDto {
  @ApiProperty({ description: 'Installment UUID' })
  @IsUUID()
  @IsNotEmpty()
  installmentId!: string;

  @ApiProperty({ description: 'Membership UUID' })
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  @ApiProperty({ example: 3300, description: 'Allocated amount towards this installment' })
  @IsNumber()
  @IsPositive()
  allocatedAmount!: number;

  @ApiPropertyOptional({ example: 'Month 2 installment full clearance' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordCollectionDto {
  @ApiProperty({ description: 'Customer UUID paying the collection' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 8300, description: 'Total collection amount received' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ enum: PaymentMode, example: PaymentMode.CASH })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ example: '2026-10-26T10:00:00.000Z', description: 'Date collection was collected' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'UPI-UTR-984812345678', description: 'Bank UTR or UPI transaction reference' })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional({ example: 'Collected at home visit by Durga' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [AllocationItemDto],
    description: 'Breakdown of which installments this payment covers (supports partial and multi-month)',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one installment allocation must be specified' })
  @ValidateNested({ each: true })
  @Type(() => AllocationItemDto)
  allocations!: AllocationItemDto[];
}
