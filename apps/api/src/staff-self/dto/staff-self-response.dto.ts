import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus, LeaveRequestStatus } from '@prisma/client';
import { ApprovalActionDto, ApprovalRequestDto } from '../../approvals/dto/approval-response.dto';

export class StaffSelfProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  departmentName!: string | null;
}

export class StaffSelfTodayAttendanceDto {
  @ApiProperty()
  date!: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, nullable: true })
  status!: AttendanceStatus | null;

  @ApiPropertyOptional({ nullable: true })
  checkInAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  checkOutAt!: string | null;
}

export class StaffSelfLeaveBalanceSummaryDto {
  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  leaveTypeName!: string;

  @ApiProperty()
  availableAmount!: number;

  @ApiProperty()
  usedAmount!: number;

  @ApiProperty()
  pendingAmount!: number;
}

export class StaffSelfLeaveRequestSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  leaveTypeName!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty({ enum: LeaveRequestStatus })
  status!: LeaveRequestStatus;

  @ApiProperty()
  submittedAt!: string;
}

export class StaffSelfDashboardDto {
  @ApiProperty({ type: StaffSelfProfileDto })
  staff!: StaffSelfProfileDto;

  @ApiProperty()
  localDate!: string;

  @ApiProperty({ type: StaffSelfTodayAttendanceDto })
  todayAttendance!: StaffSelfTodayAttendanceDto;

  @ApiProperty({ type: [StaffSelfLeaveBalanceSummaryDto] })
  leaveBalances!: StaffSelfLeaveBalanceSummaryDto[];

  @ApiProperty()
  pendingLeaveRequestCount!: number;

  @ApiProperty({ type: [StaffSelfLeaveRequestSummaryDto] })
  recentLeaveRequests!: StaffSelfLeaveRequestSummaryDto[];

  @ApiProperty()
  unreadNotificationCount!: number;
}

export class StaffSelfDashboardResponseDto {
  @ApiProperty({ type: StaffSelfDashboardDto })
  data!: StaffSelfDashboardDto;
}

export class StaffSelfLeaveRequestDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  leaveTypeName!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  duration!: number;

  @ApiPropertyOptional({ nullable: true })
  reason!: string | null;

  @ApiProperty({ enum: LeaveRequestStatus })
  status!: LeaveRequestStatus;

  @ApiProperty()
  submittedAt!: string;

  @ApiPropertyOptional({ type: ApprovalRequestDto, nullable: true })
  approval!: ApprovalRequestDto | null;

  @ApiProperty({ type: [ApprovalActionDto] })
  approvalHistory!: ApprovalActionDto[];

  @ApiPropertyOptional({ nullable: true })
  rejectionReason?: string | null;
}

export class StaffSelfLeaveRequestDetailResponseDto {
  @ApiProperty({ type: StaffSelfLeaveRequestDetailDto })
  data!: StaffSelfLeaveRequestDetailDto;
}
