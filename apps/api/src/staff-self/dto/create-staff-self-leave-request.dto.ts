import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HalfDayPart } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStaffSelfLeaveRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  leaveTypeId!: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-09-17' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ enum: HalfDayPart })
  @IsOptional()
  @IsEnum(HalfDayPart)
  halfDayPart?: HalfDayPart;

  @ApiPropertyOptional({ example: 'Family event' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
