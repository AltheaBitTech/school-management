import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VISITOR_REPORT_DATE_PATTERN } from '../constants/visitor-report.constants';

export class VisitorReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-25',
    description: 'Single calendar day for check-in filter (mutually exclusive with startDate/endDate)',
  })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(VISITOR_REPORT_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(VISITOR_REPORT_DATE_PATTERN)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(VISITOR_REPORT_DATE_PATTERN)
  endDate?: string;

  @ApiPropertyOptional({ enum: VisitorStatus })
  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hostStaffId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive substring match on purpose' })
  @IsOptional()
  @IsString()
  purpose?: string;
}
