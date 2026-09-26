import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceReportSummaryDto {
  @ApiProperty({ enum: ['single_day', 'date_range'] })
  scope!: 'single_day' | 'date_range';

  @ApiProperty()
  fromDate!: string;

  @ApiProperty()
  toDate!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({
    nullable: true,
    description: 'Active staff count; only populated for single-day reports',
  })
  activeStaff!: number | null;

  @ApiProperty({ description: 'Staff attendance records in the selected period' })
  totalMarked!: number;

  @ApiProperty()
  present!: number;

  @ApiProperty()
  absent!: number;

  @ApiProperty({
    nullable: true,
    description: 'Active staff without a record; only populated for single-day reports',
  })
  unmarked!: number | null;

  @ApiProperty({
    nullable: true,
    description:
      'Single day: present / activeStaff. Date range: present / totalMarked among marked staff-days.',
  })
  attendancePercentage!: number | null;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byStatus!: Record<string, number>;
}

export class AttendanceReportDepartmentBreakdownDto {
  @ApiProperty({ nullable: true, format: 'uuid' })
  departmentId!: string | null;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  present!: number;

  @ApiProperty()
  absent!: number;

  @ApiProperty({ nullable: true })
  attendancePercentage!: number | null;
}

export class AttendanceReportRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  attendanceDate!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty({ nullable: true, format: 'uuid' })
  departmentId!: string | null;

  @ApiProperty({ nullable: true })
  departmentName!: string | null;

  @ApiProperty({ enum: AttendanceStatus })
  status!: AttendanceStatus;

  @ApiProperty({ nullable: true })
  checkInAt!: string | null;
}

export class AttendanceReportResponseDto {
  @ApiProperty({ type: [AttendanceReportRecordDto] })
  data!: AttendanceReportRecordDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: AttendanceReportSummaryDto })
  summary!: AttendanceReportSummaryDto;

  @ApiProperty({ type: [AttendanceReportDepartmentBreakdownDto] })
  breakdown!: {
    byDepartment: AttendanceReportDepartmentBreakdownDto[];
  };
}
