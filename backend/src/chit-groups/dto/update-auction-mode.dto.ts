import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionCalculationMode } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateAuctionModeDto {
  @ApiProperty({
    enum: AuctionCalculationMode,
    example: AuctionCalculationMode.DISCOUNT_BASED,
    description: 'Auction calculation mode (DISCOUNT_BASED or FIXED_PAYOUT)',
  })
  @IsEnum(AuctionCalculationMode)
  auctionCalculationMode!: AuctionCalculationMode;

  @ApiPropertyOptional({ example: 95000, description: 'Agreed fixed payout amount for fixed-payout groups' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Fixed payout amount cannot be negative' })
  fixedPayoutAmount?: number;

  @ApiPropertyOptional({ example: 0, description: 'Configured adjustments/deductions for fixed-payout groups' })
  @IsOptional()
  @IsNumber()
  fixedPayoutAdjustments?: number;
}
