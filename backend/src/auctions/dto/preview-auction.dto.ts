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
  IsUUID,
  Min,
} from 'class-validator';

export class PreviewAuctionDto {
  @ApiProperty({ description: 'Chit Group UUID' })
  @IsUUID()
  @IsNotEmpty()
  chitGroupId!: string;

  @ApiProperty({ example: 2, description: 'Month number of the auction' })
  @IsInt()
  @IsPositive()
  monthNumber!: number;

  @ApiPropertyOptional({ example: '2026-10-10T11:00:00.000Z', description: 'Date and time of auction' })
  @IsOptional()
  @IsDateString()
  auctionDate?: string;

  @ApiPropertyOptional({
    enum: AuctionCalculationMode,
    example: AuctionCalculationMode.DISCOUNT_BASED,
    description: 'Auction calculation mode (DISCOUNT_BASED or FIXED_PAYOUT)',
  })
  @IsOptional()
  @IsEnum(AuctionCalculationMode)
  auctionCalculationMode?: AuctionCalculationMode;

  @ApiPropertyOptional({ example: 22000, description: 'Winning discount bid amount in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Winning bid discount cannot be negative' })
  winningBidAmount?: number;

  @ApiPropertyOptional({ example: 95000, description: 'Fixed agreed payout amount' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Fixed payout amount cannot be negative' })
  fixedPayoutAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Separately applicable adjustments' })
  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @ApiPropertyOptional({ description: 'Winning Membership UUID' })
  @IsOptional()
  @IsUUID()
  winningMembershipId?: string;
}
