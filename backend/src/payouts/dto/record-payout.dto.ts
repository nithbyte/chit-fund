import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMode, PayoutStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RecordPayoutDto {
  @ApiProperty({ description: 'Chit Group ID' })
  @IsUUID()
  @IsNotEmpty()
  chitGroupId!: string;

  @ApiProperty({ description: 'Winning Membership ID' })
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  @ApiProperty({ description: 'Auction ID' })
  @IsUUID()
  @IsNotEmpty()
  auctionId!: string;

  @ApiProperty({ description: 'Gross Prize Amount (e.g. ₹1,00,000)' })
  @IsNumber()
  @IsPositive()
  grossPrizeAmount!: number;

  @ApiPropertyOptional({ description: 'Bid discount or other legal deductions', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  deductionAmount?: number;

  @ApiProperty({ description: 'Net Paid Amount disbursed to customer' })
  @IsNumber()
  @IsPositive()
  netPaidAmount!: number;

  @ApiPropertyOptional({ description: 'Disbursement Date' })
  @IsOptional()
  payoutDate?: string;

  @ApiProperty({ enum: PaymentMode, default: PaymentMode.BANK_TRANSFER })
  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ApiPropertyOptional({ description: 'Bank UTR or Cheque Number' })
  @IsString()
  @IsOptional()
  transactionRef?: string;

  @ApiPropertyOptional({ description: 'Primary Guarantor Name' })
  @IsString()
  @IsOptional()
  guarantorName1?: string;

  @ApiPropertyOptional({ description: 'Primary Guarantor Phone' })
  @IsString()
  @IsOptional()
  guarantorPhone1?: string;

  @ApiPropertyOptional({ description: 'Secondary Guarantor Name' })
  @IsString()
  @IsOptional()
  guarantorName2?: string;

  @ApiPropertyOptional({ description: 'Secondary Guarantor Phone' })
  @IsString()
  @IsOptional()
  guarantorPhone2?: string;

  @ApiPropertyOptional({ description: 'Optional operational notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: PayoutStatus, default: PayoutStatus.DISBURSED })
  @IsEnum(PayoutStatus)
  @IsOptional()
  status?: PayoutStatus;
}
