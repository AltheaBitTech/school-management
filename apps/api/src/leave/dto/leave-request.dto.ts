import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HalfDayPart } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { LeaveRequestStatus } from '@prisma/client';

export class CreateLeaveRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  staffId!: string;

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

export class ListLeaveRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  leaveTypeId?: string;

  @ApiPropertyOptional({ enum: LeaveRequestStatus })
  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;
}
