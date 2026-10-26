import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'durga', description: 'Username of the owner' })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  username!: string;

  @ApiProperty({ example: 'Durga@Chit2026!', description: 'Owner account password' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
