import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ImportType {
  CUSTOMERS = 'CUSTOMERS',
  COLLECTIONS = 'COLLECTIONS',
}

export class PreviewImportDto {
  @ApiProperty({ enum: ImportType, example: ImportType.CUSTOMERS })
  @IsEnum(ImportType)
  batchType!: ImportType;

  @ApiProperty({ example: 'customers_backup.csv' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({
    example: 'Name,Phone,Address,Notes\nRamesh Kumar Verma,9848011223,Main Bazar Guntur,Kirana store\nLakshmi Narayana,9848022334,Market Road,PhonePe payer',
    description: 'Raw CSV text content to parse and validate',
  })
  @IsString()
  @IsNotEmpty()
  csvContent!: string;
}

export class ExecuteImportDto {
  @ApiProperty({ enum: ImportType, example: ImportType.CUSTOMERS })
  @IsEnum(ImportType)
  batchType!: ImportType;

  @ApiProperty({ example: 'customers_backup.csv' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ description: 'Raw original CSV text for audit backup' })
  @IsString()
  @IsNotEmpty()
  csvContent!: string;

  @ApiProperty({ description: 'Confirmed rows to import' })
  @IsArray()
  rows!: any[];
}
