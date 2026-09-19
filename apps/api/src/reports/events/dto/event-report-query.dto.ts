import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, EventType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EVENT_REPORT_DATE_PATTERN } from '../constants/event-report.constants';

export class EventReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-09-18' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(EVENT_REPORT_DATE_PATTERN)
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: false })
  @Matches(EVENT_REPORT_DATE_PATTERN)
  toDate?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ enum: EventStatus })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  venueId?: string;
}
