import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HalfDayPart, LeaveRequestStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class LeaveTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  tracksBalance!: boolean;

  @ApiProperty()
  allowsHalfDay!: boolean;

  @ApiProperty()
  requiresReason!: boolean;

  @ApiProperty()
  requiresAttachment!: boolean;

  @ApiProperty()
  active!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class LeaveBalanceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  periodStart!: string;

  @ApiProperty()
  periodEnd!: string;

  @ApiProperty()
  openingBalance!: number;

  @ApiProperty()
  allocatedAmount!: number;

  @ApiProperty()
  usedAmount!: number;

  @ApiProperty()
  pendingAmount!: number;

  @ApiProperty()
  adjustmentAmount!: number;

  @ApiProperty()
  availableAmount!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class LeaveRequestStaffSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;
}

export class LeaveRequestTypeSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class LeaveRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  leaveTypeId!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty()
  duration!: number;

  @ApiPropertyOptional({ enum: HalfDayPart })
  halfDayPart?: HalfDayPart | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiProperty({ enum: LeaveRequestStatus })
  status!: LeaveRequestStatus;

  @ApiProperty()
  submittedAt!: string;

  @ApiPropertyOptional()
  decidedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  decidedByUserId?: string | null;

  @ApiPropertyOptional({ type: LeaveRequestStaffSummaryDto })
  staff?: LeaveRequestStaffSummaryDto;

  @ApiPropertyOptional({ type: LeaveRequestTypeSummaryDto })
  leaveType?: LeaveRequestTypeSummaryDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class LeaveTypeResponseDto {
  @ApiProperty({ type: LeaveTypeDto })
  data!: LeaveTypeDto;
}

export class PaginatedLeaveTypesResponseDto {
  @ApiProperty({ type: [LeaveTypeDto] })
  data!: LeaveTypeDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class LeaveBalanceResponseDto {
  @ApiProperty({ type: LeaveBalanceDto })
  data!: LeaveBalanceDto;
}

export class PaginatedLeaveBalancesResponseDto {
  @ApiProperty({ type: [LeaveBalanceDto] })
  data!: LeaveBalanceDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class LeaveRequestResponseDto {
  @ApiProperty({ type: LeaveRequestDto })
  data!: LeaveRequestDto;
}

export class PaginatedLeaveRequestsResponseDto {
  @ApiProperty({ type: [LeaveRequestDto] })
  data!: LeaveRequestDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
