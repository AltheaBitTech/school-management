import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ASSET_DESCRIPTION_MAX_LENGTH,
  ASSET_IDENTIFIER_MAX_LENGTH,
  ASSET_LOCATION_MAX_LENGTH,
  ASSET_MAINTENANCE_DESCRIPTION_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  ASSET_RETIREMENT_REASON_MAX_LENGTH,
  ASSET_TRANSFER_REASON_MAX_LENGTH,
} from '../constants/asset.constants';
import { IsAssetDate } from '../validators/is-asset-date.validator';
import { IsNotBlankTrimmed } from '../validators/is-not-blank-trimmed.validator';

export class CreateAssetDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: 'Dell Latitude 5440' })
  @IsString()
  @IsNotBlankTrimmed()
  @MaxLength(ASSET_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  qrCode?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsAssetDate()
  purchaseDate?: string;

  @ApiPropertyOptional({ example: 68500 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsAssetDate()
  warrantyStartDate?: string;

  @ApiPropertyOptional({ example: '2029-08-14' })
  @IsOptional()
  @IsAssetDate()
  warrantyEndDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_LOCATION_MAX_LENGTH)
  location?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedStaffId?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotBlankTrimmed()
  @MaxLength(ASSET_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  serialNumber?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_IDENTIFIER_MAX_LENGTH)
  qrCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsAssetDate()
  purchaseDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsAssetDate()
  warrantyStartDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsAssetDate()
  warrantyEndDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_LOCATION_MAX_LENGTH)
  location?: string | null;
}

export class AssignAssetDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;
}

export class TransferAssetDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_LOCATION_MAX_LENGTH)
  location?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  staffId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_TRANSFER_REASON_MAX_LENGTH)
  reason?: string;
}

export class StartMaintenanceDto {
  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType!: MaintenanceType;

  @ApiProperty()
  @IsString()
  @IsNotBlankTrimmed()
  @MaxLength(ASSET_MAINTENANCE_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(ASSET_DESCRIPTION_MAX_LENGTH)
  remarks?: string;
}

export class RetireAssetDto {
  @ApiProperty()
  @IsString()
  @IsNotBlankTrimmed()
  @MaxLength(ASSET_RETIREMENT_REASON_MAX_LENGTH)
  reason!: string;
}
