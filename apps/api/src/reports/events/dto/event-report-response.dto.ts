import { ApiProperty } from '@nestjs/swagger';
import { EventStatus, EventType } from '@prisma/client';

export class EventReportVenueDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class EventReportRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: EventType })
  type!: EventType;

  @ApiProperty({ enum: EventStatus })
  status!: EventStatus;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty({ type: EventReportVenueDto })
  venue!: EventReportVenueDto;
}

export class EventReportSummaryDto {
  @ApiProperty()
  total!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus!: Record<string, number>;
}

export class EventReportResponseDto {
  @ApiProperty({ type: [EventReportRowDto] })
  data!: EventReportRowDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: EventReportSummaryDto })
  summary!: EventReportSummaryDto;
}
