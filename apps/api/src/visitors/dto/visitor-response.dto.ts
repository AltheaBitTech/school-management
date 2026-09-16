import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorHistoryEvent, VisitorStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class VisitorStaffSummaryDto {
  @ApiProperty({ format: 'uuid' })
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

export class VisitorUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;
}

export class VisitorHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: VisitorHistoryEvent })
  eventType!: VisitorHistoryEvent;

  @ApiPropertyOptional({ nullable: true })
  comment?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ type: VisitorUserSummaryDto })
  actorUser?: VisitorUserSummaryDto;
}

export class VisitorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  visitorCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  mobile!: string;

  @ApiPropertyOptional({ nullable: true })
  organizationName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  vehicleNumber?: string | null;

  @ApiProperty()
  purpose!: string;

  @ApiProperty({ format: 'uuid' })
  hostStaffId!: string;

  @ApiProperty()
  checkInAt!: string;

  @ApiPropertyOptional({ nullable: true })
  checkOutAt?: string | null;

  @ApiProperty({ enum: VisitorStatus })
  status!: VisitorStatus;

  @ApiPropertyOptional({ nullable: true })
  remarks?: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: VisitorStaffSummaryDto })
  hostStaff?: VisitorStaffSummaryDto;

  @ApiPropertyOptional({ type: VisitorUserSummaryDto })
  createdBy?: VisitorUserSummaryDto;

  @ApiPropertyOptional({ type: [VisitorHistoryEntryDto] })
  history?: VisitorHistoryEntryDto[];
}

export class VisitorResponseDto {
  @ApiProperty({ type: VisitorDto })
  data!: VisitorDto;
}

export class PaginatedVisitorsResponseDto {
  @ApiProperty({ type: [VisitorDto] })
  data!: VisitorDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class VisitorHistoryResponseDto {
  @ApiProperty({ type: [VisitorHistoryEntryDto] })
  data!: VisitorHistoryEntryDto[];
}
