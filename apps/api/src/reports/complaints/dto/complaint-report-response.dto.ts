import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@prisma/client';

export class ComplaintReportSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  fromDate!: string | null;

  @ApiPropertyOptional({ nullable: true })
  toDate!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  dateFilterApplied!: boolean;

  @ApiProperty()
  totalComplaints!: number;

  @ApiProperty({
    description: 'Matches dashboard open complaints: OPEN, ASSIGNED, IN_PROGRESS, COMPLETED.',
  })
  openComplaints!: number;

  @ApiProperty()
  assignedComplaints!: number;

  @ApiProperty()
  inProgressComplaints!: number;

  @ApiProperty()
  completedComplaints!: number;

  @ApiProperty()
  closedComplaints!: number;

  @ApiProperty()
  highPriorityComplaints!: number;
}

export class ComplaintReportAgeBucketDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  count!: number;
}

export class ComplaintReportStatusRowDto {
  @ApiProperty({ enum: ComplaintStatus })
  status!: ComplaintStatus;

  @ApiProperty()
  count!: number;
}

export class ComplaintReportPriorityRowDto {
  @ApiProperty({ enum: ComplaintPriority })
  priority!: ComplaintPriority;

  @ApiProperty()
  count!: number;
}

export class ComplaintReportCategoryRowDto {
  @ApiProperty({ enum: ComplaintCategory })
  category!: ComplaintCategory;

  @ApiProperty()
  count!: number;
}

export class ComplaintReportDepartmentRowDto {
  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  open!: number;

  @ApiProperty()
  completed!: number;
}

export class ComplaintReportAssigneeRowDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  open!: number;

  @ApiProperty()
  completed!: number;
}

export class ComplaintReportRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  complaintCode!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: ComplaintCategory })
  category!: ComplaintCategory;

  @ApiProperty({ enum: ComplaintPriority })
  priority!: ComplaintPriority;

  @ApiProperty({ enum: ComplaintStatus })
  status!: ComplaintStatus;

  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  departmentName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  assigneeStaffId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  assigneeName!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  ageDays!: number;

  @ApiPropertyOptional({ nullable: true })
  closedAt!: string | null;
}

export class ComplaintReportBreakdownDto {
  @ApiProperty({ type: [ComplaintReportStatusRowDto] })
  byStatus!: ComplaintReportStatusRowDto[];

  @ApiProperty({ type: [ComplaintReportPriorityRowDto] })
  byPriority!: ComplaintReportPriorityRowDto[];

  @ApiProperty({ type: [ComplaintReportCategoryRowDto] })
  byCategory!: ComplaintReportCategoryRowDto[];

  @ApiProperty({ type: [ComplaintReportDepartmentRowDto] })
  byDepartment!: ComplaintReportDepartmentRowDto[];

  @ApiProperty({ type: [ComplaintReportAssigneeRowDto] })
  byAssignee!: ComplaintReportAssigneeRowDto[];
}

export class ComplaintReportResponseDto {
  @ApiProperty({ type: [ComplaintReportRecordDto] })
  data!: ComplaintReportRecordDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  @ApiProperty({ type: ComplaintReportSummaryDto })
  summary!: ComplaintReportSummaryDto;

  @ApiProperty({ type: ComplaintReportBreakdownDto })
  breakdown!: ComplaintReportBreakdownDto;

  @ApiProperty({ type: [ComplaintReportAgeBucketDto] })
  ageing!: ComplaintReportAgeBucketDto[];
}
