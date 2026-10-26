import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ramesh Kumar Verma', description: 'Full name of customer' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @ApiProperty({ example: '9848011223', description: '10-digit mobile number' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone!: string;

  @ApiPropertyOptional({ example: '9848011224', description: 'Alternate contact number' })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'ramesh@example.com', description: 'Email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'Plot 12, Main Bazar, Guntur', description: 'Residential or business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Aadhaar Card', description: 'Identity proof document type' })
  @IsOptional()
  @IsString()
  identityProofType?: string;

  @ApiPropertyOptional({ example: '1234-5678-9012', description: 'Identity document number' })
  @IsOptional()
  @IsString()
  identityProofNumber?: string;

  @ApiPropertyOptional({ example: 'Kirana store owner, reliable cash payer', description: 'Internal notebook notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false, description: 'Explicitly confirm creation even if warning matches existing phone' })
  @IsOptional()
  confirmDuplicate?: boolean;
}
