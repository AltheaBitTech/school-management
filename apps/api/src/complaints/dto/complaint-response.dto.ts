import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class ComplaintStaffSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName?: string | null;
}

export class ComplaintUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;
}

export class ComplaintHistoryEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  actorUserId!: string;

  @ApiPropertyOptional({ enum: ComplaintStatus, nullable: true })
  oldStatus?: ComplaintStatus | null;

  @ApiPropertyOptional({ enum: ComplaintStatus, nullable: true })
  newStatus?: ComplaintStatus | null;

  @ApiPropertyOptional({ nullable: true })
  comment?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ type: ComplaintUserSummaryDto })
  actor?: ComplaintUserSummaryDto;
}

export class ComplaintResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  complaintCode!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ComplaintCategory })
  category!: ComplaintCategory;

  @ApiProperty({ enum: ComplaintPriority })
  priority!: ComplaintPriority;

  @ApiProperty({ enum: ComplaintStatus })
  status!: ComplaintStatus;

  @ApiProperty()
  createdByUserId!: string;

  @ApiPropertyOptional({ nullable: true })
  assignedToStaffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  location?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  closedAt?: string | null;

  @ApiPropertyOptional({ type: ComplaintUserSummaryDto })
  createdBy?: ComplaintUserSummaryDto;

  @ApiPropertyOptional({ type: ComplaintStaffSummaryDto, nullable: true })
  assignedToStaff?: ComplaintStaffSummaryDto | null;

  @ApiPropertyOptional({ type: [ComplaintHistoryEntryDto] })
  history?: ComplaintHistoryEntryDto[];
}

export class PaginatedComplaintsResponseDto {
  @ApiProperty({ type: [ComplaintResponseDto] })
  data!: ComplaintResponseDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
