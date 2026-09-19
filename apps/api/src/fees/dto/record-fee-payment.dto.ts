import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeePaymentMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RecordFeePaymentDto {
  @ApiProperty({ example: 10000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ enum: FeePaymentMethod, example: FeePaymentMethod.CASH })
  @IsEnum(FeePaymentMethod)
  paymentMethod!: FeePaymentMethod;

  @ApiPropertyOptional({ example: 'TXN-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @ApiPropertyOptional({ example: 'Collected at front office' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
