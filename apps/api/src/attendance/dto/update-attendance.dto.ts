import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ example: '2026-09-12T09:05:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string | null;

  @ApiPropertyOptional({ example: '2026-09-12T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string | null;

  @ApiPropertyOptional({ example: 'Corrected after review' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;
}
