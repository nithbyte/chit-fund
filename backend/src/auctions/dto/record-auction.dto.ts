import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

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

  @ApiProperty({ example: 22000, description: 'Winning discount bid amount in INR' })
  @IsNumber()
  @IsPositive()
  winningBidAmount!: number;

  @ApiProperty({ description: 'Winning Membership UUID' })
  @IsUUID()
  @IsNotEmpty()
  winningMembershipId!: string;

  @ApiPropertyOptional({ example: 'Bidding closed at 11:30 AM after 8 bids.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
