import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorStatus } from '@prisma/client';

export class VisitorReportSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  fromDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  toDate!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  dateFilterApplied!: boolean;

  @ApiProperty({ enum: ['none', 'single_day', 'date_range'] })
  scope!: 'none' | 'single_day' | 'date_range';

  @ApiProperty()
  totalVisits!: number;

  @ApiProperty({ description: 'Visitors in the filtered set with status CHECKED_IN' })
  checkedInVisits!: number;

  @ApiProperty({ description: 'Visitors in the filtered set with status CHECKED_OUT' })
  checkedOutVisits!: number;

  @ApiProperty({
    description:
      'Organization-wide visitors with status CHECKED_IN (matches dashboard active on campus; not limited by date filter)',
  })
  activeOnCampus!: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'When a single-day check-in filter is applied, count of check-ins on that day (matches dashboard checkedInToday)',
  })
  checkedInOnSelectedDay!: number | null;
}

export class VisitorReportStatusRowDto {
  @ApiProperty({ enum: VisitorStatus })
  status!: VisitorStatus;

  @ApiProperty()
  count!: number;
}

export class VisitorReportPurposeRowDto {
  @ApiProperty()
  purpose!: string;

  @ApiProperty()
  count!: number;
}

export class VisitorReportHostRowDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;
}

export class VisitorReportDepartmentRowDto {
  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;
}

export class VisitorReportRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  visitorCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mobile!: string;

  @ApiProperty()
  purpose!: string;

  @ApiProperty()
  hostStaffId!: string;

  @ApiProperty()
  hostName!: string;

  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  departmentName!: string | null;

  @ApiProperty()
  checkInAt!: string;

  @ApiPropertyOptional({ nullable: true })
  checkOutAt!: string | null;

  @ApiProperty({ enum: VisitorStatus })
  status!: VisitorStatus;

  @ApiProperty({ description: 'Local calendar date of check-in in organization timezone' })
  visitDate!: string;
}

export class VisitorReportBreakdownDto {
  @ApiProperty({ type: [VisitorReportStatusRowDto] })
  byStatus!: VisitorReportStatusRowDto[];

  @ApiProperty({ type: [VisitorReportPurposeRowDto] })
  byPurpose!: VisitorReportPurposeRowDto[];

  @ApiProperty({ type: [VisitorReportHostRowDto] })
  byHost!: VisitorReportHostRowDto[];

  @ApiProperty({ type: [VisitorReportDepartmentRowDto] })
  byDepartment!: VisitorReportDepartmentRowDto[];
}

export class VisitorReportResponseDto {
  @ApiProperty({ type: [VisitorReportRecordDto] })
  data!: VisitorReportRecordDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: VisitorReportSummaryDto })
  summary!: VisitorReportSummaryDto;

  @ApiProperty({ type: VisitorReportBreakdownDto })
  breakdown!: VisitorReportBreakdownDto;
}
