import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'Annual Tuition 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Standard tuition fee for academic year 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 50000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2027-03-31' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ example: 'Term 1' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  installmentLabel?: string;

  @ApiPropertyOptional({ example: '2026-06-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2025-2026' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;
}
