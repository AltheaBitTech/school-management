import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AssetCategoryStatus,
  AssetHistoryEvent,
  AssetStatus,
  MaintenanceType,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class AssetStaffSummaryDto {
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

export class AssetStudentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  studentCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName?: string | null;
}

export class AssetUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;
}

export class AssetDepartmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class AssetCategorySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: AssetCategoryStatus })
  status!: AssetCategoryStatus;
}

export class AssetCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: AssetCategoryStatus })
  status!: AssetCategoryStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AssetHistoryEntryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AssetHistoryEvent })
  eventType!: AssetHistoryEvent;

  @ApiPropertyOptional({ nullable: true })
  comment?: string | null;

  @ApiProperty({ format: 'uuid' })
  actorUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ type: AssetUserSummaryDto })
  actorUser?: AssetUserSummaryDto;
}

export class AssetMaintenanceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assetId!: string;

  @ApiProperty({ enum: MaintenanceType })
  maintenanceType!: MaintenanceType;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  startedAt!: string;

  @ApiPropertyOptional({ nullable: true })
  completedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  cost?: number | null;

  @ApiPropertyOptional({ nullable: true })
  vendorName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  remarks?: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: AssetUserSummaryDto })
  createdBy?: AssetUserSummaryDto;
}

export class AssetTransferDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  assetId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  fromDepartmentId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  toDepartmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  fromLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  toLocation?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  fromStaffId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  toStaffId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;

  @ApiProperty({ format: 'uuid' })
  transferredByUserId!: string;

  @ApiProperty()
  transferredAt!: string;

  @ApiPropertyOptional({ type: AssetUserSummaryDto })
  transferredBy?: AssetUserSummaryDto;
}

export class AssetDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  assetCode!: string;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  serialNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  barcode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  qrCode?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-08-15' })
  purchaseDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  purchaseCost?: number | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-08-15' })
  warrantyStartDate?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2029-08-14' })
  warrantyEndDate?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  location?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedStaffId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assignedStudentId?: string | null;

  @ApiProperty({ enum: AssetStatus })
  status!: AssetStatus;

  @ApiPropertyOptional({ nullable: true })
  retiredAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  retirementReason?: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: AssetCategorySummaryDto })
  category?: AssetCategorySummaryDto;

  @ApiPropertyOptional({ type: AssetDepartmentSummaryDto, nullable: true })
  department?: AssetDepartmentSummaryDto | null;

  @ApiPropertyOptional({ type: AssetStaffSummaryDto, nullable: true })
  assignedStaff?: AssetStaffSummaryDto | null;

  @ApiPropertyOptional({ type: AssetStudentSummaryDto, nullable: true })
  assignedStudent?: AssetStudentSummaryDto | null;

  @ApiPropertyOptional({ type: AssetUserSummaryDto })
  createdBy?: AssetUserSummaryDto;

  @ApiPropertyOptional({ type: [AssetMaintenanceDto] })
  maintenances?: AssetMaintenanceDto[];

  @ApiPropertyOptional({ type: [AssetTransferDto] })
  transfers?: AssetTransferDto[];

  @ApiPropertyOptional({ type: [AssetHistoryEntryDto] })
  history?: AssetHistoryEntryDto[];
}

export class AssetResponseDto {
  @ApiProperty({ type: AssetDto })
  data!: AssetDto;
}

export class PaginatedAssetsResponseDto {
  @ApiProperty({ type: [AssetDto] })
  data!: AssetDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class AssetHistoryResponseDto {
  @ApiProperty({ type: [AssetHistoryEntryDto] })
  data!: AssetHistoryEntryDto[];
}

export class AssetCategoryListResponseDto {
  @ApiProperty({ type: [AssetCategoryDto] })
  data!: AssetCategoryDto[];
}

export class AssetMaintenanceResponseDto {
  @ApiProperty({ type: AssetMaintenanceDto })
  data!: AssetMaintenanceDto;
}

export class AssetTransferResponseDto {
  @ApiProperty({ type: AssetTransferDto })
  data!: AssetTransferDto;
}
