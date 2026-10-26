import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { CommissionType } from '@prisma/client';

export class UpdateCommissionDto {
  @ApiProperty({
    enum: CommissionType,
    example: CommissionType.PERCENTAGE_OF_CHIT_VALUE,
    description: 'Selected commission option type',
  })
  @IsEnum(CommissionType)
  commissionType!: CommissionType;

  @ApiPropertyOptional({ example: 5.0, description: 'Percentage rate if percentage-based' })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ example: 500, description: 'Fixed fee in INR if fixed amount type' })
  @IsOptional()
  @IsNumber()
  commissionAmount?: number;

  @ApiPropertyOptional({ example: 'CHIT_VALUE', description: 'Calculation base descriptor' })
  @IsOptional()
  @IsString()
  commissionCalculationBase?: string;

  @ApiPropertyOptional({ example: 'Approved by scheme agreement', description: 'Commission notes & rules' })
  @IsOptional()
  @IsString()
  commissionNotes?: string;

  @ApiProperty({ example: true, description: 'Owner Durga explicitly confirms the applicable commission terms' })
  @IsBoolean()
  isCommissionConfirmed!: boolean;
}
