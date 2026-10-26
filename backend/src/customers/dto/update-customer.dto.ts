import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Ramesh Kumar Verma' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '9848011223' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone?: string;

  @ApiPropertyOptional({ example: '9848011224' })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'ramesh@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 12, Main Bazar, Guntur' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Aadhaar Card' })
  @IsOptional()
  @IsString()
  identityProofType?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012' })
  @IsOptional()
  @IsString()
  identityProofNumber?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
