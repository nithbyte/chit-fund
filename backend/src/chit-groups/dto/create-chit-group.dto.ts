import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ChitType } from '@prisma/client';

export class CreateChitGroupDto {
  @ApiProperty({ example: 'CF-300K-20M', description: 'Unique group code' })
  @IsString()
  @IsNotEmpty({ message: 'Group code is required' })
  groupCode!: string;

  @ApiProperty({ example: '₹3 Lakh 20-Month Auction Chit', description: 'Friendly group title' })
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  name!: string;

  @ApiProperty({ enum: ChitType, default: ChitType.AUCTION_BASED })
  @IsEnum(ChitType)
  chitType!: ChitType;

  @ApiProperty({ example: 300000, description: 'Total chit value in INR' })
  @IsNumber()
  @IsPositive()
  totalValue!: number;

  @ApiProperty({ example: 15000, description: 'Base monthly installment contribution' })
  @IsNumber()
  @IsPositive()
  monthlyContribution!: number;

  @ApiProperty({ example: 20, description: 'Total months / total tickets' })
  @IsInt()
  @Min(2)
  totalMonths!: number;

  @ApiProperty({ example: '2026-11-01', description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Foreman commission percent (legacy field)' })
  @IsOptional()
  @IsNumber()
  foremanCommissionRate?: number;

  @ApiPropertyOptional({
    enum: [
      'NOT_CONFIGURED',
      'NO_COMMISSION',
      'PERCENTAGE_OF_CHIT_VALUE',
      'PERCENTAGE_OF_EACH_COLLECTION',
      'FIXED_AMOUNT_PER_INSTALLMENT',
      'FIXED_AMOUNT_PER_CHIT_GROUP',
      'AUCTION_BASED_EARNINGS',
      'CUSTOM_OTHER',
    ],
    default: 'NOT_CONFIGURED',
    description: 'Commission calculation method',
  })
  @IsOptional()
  @IsString()
  commissionType?: string;

  @ApiPropertyOptional({ example: 5.0, description: 'Commission rate percentage if percentage-based' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ example: 500, description: 'Fixed commission amount in INR if fixed-fee' })
  @IsOptional()
  @IsNumber()
  commissionAmount?: number;

  @ApiPropertyOptional({ example: 'CHIT_VALUE', description: 'Base identifier for commission calculation' })
  @IsOptional()
  @IsString()
  commissionCalculationBase?: string;

  @ApiPropertyOptional({ example: 'Foreman fee per Chit Funds Act', description: 'Explanation or custom rules' })
  @IsOptional()
  @IsString()
  commissionNotes?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the commission terms are officially confirmed' })
  @IsOptional()
  isCommissionConfirmed?: boolean;

  @ApiPropertyOptional({ example: 15000, description: 'Minimum bid discount in INR' })
  @IsOptional()
  @IsNumber()
  minBidDiscount?: number;

  @ApiPropertyOptional({ example: 90000, description: 'Maximum bid discount in INR' })
  @IsOptional()
  @IsNumber()
  maxBidDiscount?: number;

  @ApiPropertyOptional({ example: 10, description: 'Day of month for recurring auctions' })
  @IsOptional()
  @IsInt()
  auctionDayOfMonth?: number;

  @ApiPropertyOptional({ example: 'MONTHLY', enum: ['MONTHLY', 'WEEKLY'], description: 'Installment & auction frequency' })
  @IsOptional()
  @IsString()
  auctionFrequency?: string;

  @ApiPropertyOptional({ example: 'PLANNED', enum: ['PLANNED', 'ACTIVE'], description: 'Chit group lifecycle status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    enum: ['DISCOUNT_BASED', 'FIXED_PAYOUT'],
    default: 'DISCOUNT_BASED',
    description: 'Auction calculation mode (DISCOUNT_BASED or FIXED_PAYOUT)',
  })
  @IsOptional()
  @IsString()
  auctionCalculationMode?: string;

  @ApiPropertyOptional({ example: 95000, description: 'Agreed fixed winner payout for fixed-payout groups' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPayoutAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Configured adjustments/deductions for fixed-payout groups' })
  @IsOptional()
  @IsNumber()
  fixedPayoutAdjustments?: number;

  @ApiPropertyOptional({ example: 'Monthly auction chit with 20 members.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
