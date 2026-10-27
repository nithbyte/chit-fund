import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionCalculationMode } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RecordAuctionDto {
  @ApiProperty({ description: 'Chit Group UUID' })
  @IsUUID()
  @IsNotEmpty()
  chitGroupId!: string;

  @ApiProperty({ example: 2, description: 'Month number of the auction' })
  @IsInt()
  @IsPositive()
  monthNumber!: number;

  @ApiProperty({ example: '2026-10-10T11:00:00.000Z', description: 'Date and time auction was conducted' })
  @IsDateString()
  auctionDate!: string;

  @ApiPropertyOptional({
    enum: AuctionCalculationMode,
    example: AuctionCalculationMode.DISCOUNT_BASED,
    description: 'Auction calculation mode (DISCOUNT_BASED or FIXED_PAYOUT). Defaults to the group setting.',
  })
  @IsOptional()
  @IsEnum(AuctionCalculationMode)
  auctionCalculationMode?: AuctionCalculationMode;

  @ApiPropertyOptional({ example: 22000, description: 'Winning discount bid amount in INR (0 for fixed payout)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Winning bid discount cannot be negative' })
  winningBidAmount?: number;

  @ApiPropertyOptional({ example: 95000, description: 'Fixed agreed winner payout for FIXED_PAYOUT mode' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Fixed payout amount cannot be negative' })
  fixedPayoutAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Separately applicable, explicitly configured adjustments' })
  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @ApiProperty({ description: 'Winning Membership UUID' })
  @IsUUID()
  @IsNotEmpty()
  winningMembershipId!: string;

  @ApiPropertyOptional({ example: 'Bidding closed at 11:30 AM after 8 bids.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
