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

  @ApiPropertyOptional({ example: 5.0, description: 'Foreman commission percent (e.g. 5.0%)' })
  @IsOptional()
  @IsNumber()
  foremanCommissionRate?: number;

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

  @ApiPropertyOptional({ example: 'Monthly auction chit with 20 members.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
