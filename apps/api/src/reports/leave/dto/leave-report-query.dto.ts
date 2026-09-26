import { ApiPropertyOptional } from '@nestjs/swagger';
import { LeaveRequestStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LEAVE_REPORT_DATE_PATTERN } from '../constants/leave-report.constants';

export class LeaveReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-09-25' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(LEAVE_REPORT_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(LEAVE_REPORT_DATE_PATTERN)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(LEAVE_REPORT_DATE_PATTERN)
  endDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ enum: LeaveRequestStatus })
  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  leaveTypeId?: string;
}
