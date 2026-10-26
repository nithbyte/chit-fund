import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ActivateChitGroupDto {
  @ApiProperty({ example: '2026-11-01', description: 'Confirmed start date for the chit group' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ example: 20, description: 'Confirmed member capacity / total installments' })
  @IsInt()
  @Min(2)
  totalMonths!: number;

  @ApiPropertyOptional({ example: 5.0, description: 'Foreman commission rate percentage' })
  @IsOptional()
  @IsNumber()
  foremanCommissionRate?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Minimum bid discount in INR' })
  @IsOptional()
  @IsNumber()
  minBidDiscount?: number;

  @ApiPropertyOptional({ example: 40000, description: 'Maximum bid discount in INR' })
  @IsOptional()
  @IsNumber()
  maxBidDiscount?: number;

  @ApiPropertyOptional({ example: 'Winning member receives ₹1,00,000 stated prize minus winning bid discount and 5% foreman commission.' })
  @IsOptional()
  @IsString()
  payoutRuleNotes?: string;

  @ApiProperty({ example: true, description: 'Explicit confirmation flag by owner Durga' })
  @IsBoolean()
  confirmActivation!: boolean;
}
