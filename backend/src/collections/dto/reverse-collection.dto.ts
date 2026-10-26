import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ReverseCollectionDto {
  @ApiProperty({
    example: 'Entered wrong payment mode / duplicate voucher entered from notebook',
    description: 'Mandatory reason explaining why this payment record is being reversed',
  })
  @IsString()
  @MinLength(5, { message: 'Reversal reason must be at least 5 characters long' })
  @IsNotEmpty({ message: 'Reversal reason is required' })
  reason!: string;
}
