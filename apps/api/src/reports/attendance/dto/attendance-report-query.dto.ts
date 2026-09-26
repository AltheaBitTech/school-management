import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ATTENDANCE_REPORT_DATE_PATTERN } from '../constants/attendance-report.constants';

export class AttendanceReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-25',
    description: 'Single calendar day in the organization context (mutually exclusive with startDate/endDate)',
  })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(ATTENDANCE_REPORT_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(ATTENDANCE_REPORT_DATE_PATTERN)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(ATTENDANCE_REPORT_DATE_PATTERN)
  endDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
