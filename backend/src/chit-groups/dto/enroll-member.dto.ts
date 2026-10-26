import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class EnrollMemberDto {
  @ApiProperty({ example: 'customer-uuid', description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ example: 4, description: 'Ticket number (1 to totalMonths)' })
  @IsInt()
  @IsPositive()
  ticketNumber!: number;

  @ApiPropertyOptional({ example: 'Lakshmi Devi', description: 'Nominee full name' })
  @IsOptional()
  @IsString()
  nomineeName?: string;

  @ApiPropertyOptional({ example: '9848099887', description: 'Nominee mobile number' })
  @IsOptional()
  @IsString()
  nomineePhone?: string;

  @ApiPropertyOptional({ example: 'Enrolled via shop visit' })
  @IsOptional()
  @IsString()
  notes?: string;
}
