import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  timezone!: string;
}

export class DashboardTodayAttendanceDto {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  activeStaff!: number;

  @ApiProperty()
  marked!: number;

  @ApiProperty()
  present!: number;

  @ApiProperty()
  absent!: number;

  @ApiProperty()
  unmarked!: number;
}

export class DashboardOutstandingFeesDto {
  @ApiProperty()
  totalOutstanding!: number;

  @ApiProperty()
  feeCount!: number;
}

export class DashboardVisitorsTodayDto {
  @ApiProperty()
  checkedInToday!: number;

  @ApiProperty()
  activeOnCampus!: number;
}

export class DashboardUpcomingEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiPropertyOptional()
  venueName?: string | null;
}

export class DashboardRecentNoticeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  publishedAt?: string | null;
}

export class DashboardSummarySectionsDto {
  @ApiPropertyOptional()
  students?: number | null;

  @ApiPropertyOptional()
  activeStaff?: number | null;

  @ApiPropertyOptional({ type: DashboardTodayAttendanceDto })
  todayAttendance?: DashboardTodayAttendanceDto | null;

  @ApiPropertyOptional({ type: DashboardOutstandingFeesDto })
  outstandingFees?: DashboardOutstandingFeesDto | null;

  @ApiPropertyOptional()
  pendingLeave?: number | null;

  @ApiPropertyOptional()
  pendingApprovals?: number | null;

  @ApiPropertyOptional()
  openComplaints?: number | null;

  @ApiPropertyOptional({ type: DashboardVisitorsTodayDto })
  visitorsToday?: DashboardVisitorsTodayDto | null;

  @ApiPropertyOptional({ type: DashboardUpcomingEventDto, isArray: true })
  upcomingEvents?: DashboardUpcomingEventDto[] | null;

  @ApiPropertyOptional({ type: DashboardRecentNoticeDto, isArray: true })
  recentNotices?: DashboardRecentNoticeDto[] | null;

  @ApiPropertyOptional()
  unreadNotifications?: number | null;
}

export class DashboardSummaryDto {
  @ApiProperty({ type: DashboardOrganizationDto })
  organization!: DashboardOrganizationDto;

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty()
  localDate!: string;

  @ApiProperty({ enum: ['morning', 'afternoon', 'evening'] })
  greetingPeriod!: 'morning' | 'afternoon' | 'evening';

  @ApiProperty({ type: DashboardSummarySectionsDto })
  metrics!: DashboardSummarySectionsDto;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardSummaryDto })
  data!: DashboardSummaryDto;
}
