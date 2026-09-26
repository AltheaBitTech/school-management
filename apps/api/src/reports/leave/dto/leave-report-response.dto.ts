import { ApiProperty } from '@nestjs/swagger';
import { ApprovalRequestStatus, LeaveRequestStatus } from '@prisma/client';

export class LeaveReportSummaryDto {
  @ApiProperty()
  fromDate!: string | null;

  @ApiProperty()
  toDate!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({
    description: 'When false, leave period overlap filtering is not applied (e.g. status-only dashboard view).',
  })
  dateFilterApplied!: boolean;

  @ApiProperty()
  totalRequests!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty({
    description: 'Distinct staff with APPROVED leave overlapping the filtered period.',
  })
  employeesOnLeave!: number;

  @ApiProperty({
    description: 'Sum of LeaveRequest.duration for APPROVED requests in the filtered set.',
  })
  leaveDaysApproved!: number;
}

export class LeaveReportDepartmentBreakdownDto {
  @ApiProperty({ nullable: true, format: 'uuid' })
  departmentId!: string | null;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  approved!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty()
  leaveDays!: number;
}

export class LeaveReportRecordDto {
  @ApiProperty()
  id!: string;

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

  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  leaveTypeName!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  duration!: number;

  @ApiProperty({ enum: LeaveRequestStatus })
  status!: LeaveRequestStatus;

  @ApiProperty({ nullable: true, format: 'uuid' })
  approvalRequestId!: string | null;

  @ApiProperty({ nullable: true, enum: ApprovalRequestStatus })
  approvalStatus!: ApprovalRequestStatus | null;

  @ApiProperty()
  submittedAt!: string;

  @ApiProperty({ nullable: true })
  decidedAt!: string | null;
}

export class LeaveReportBalanceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  periodStart!: string;

  @ApiProperty()
  periodEnd!: string;

  @ApiProperty()
  allocatedAmount!: number;

  @ApiProperty()
  usedAmount!: number;

  @ApiProperty()
  pendingAmount!: number;

  @ApiProperty()
  availableAmount!: number;
}

export class LeaveReportResponseDto {
  @ApiProperty({ type: [LeaveReportRecordDto] })
  data!: LeaveReportRecordDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: LeaveReportSummaryDto })
  summary!: LeaveReportSummaryDto;

  @ApiProperty({ type: [LeaveReportDepartmentBreakdownDto] })
  breakdown!: {
    byDepartment: LeaveReportDepartmentBreakdownDto[];
  };

  @ApiProperty({
    type: [LeaveReportBalanceDto],
    nullable: true,
    description: 'Populated when staffId filter is set; uses the same balance calculation as leave balances.',
  })
  balances!: LeaveReportBalanceDto[] | null;
}
