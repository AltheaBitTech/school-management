import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateTransportRouteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code!: string;
}

export class UpdateTransportRouteDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TransportStopInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  address?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  pickupTime?: string;
}

export class ReplaceTransportStopsDto {
  @ValidateNested({ each: true })
  @Type(() => TransportStopInputDto)
  @ArrayMaxSize(40)
  stops!: TransportStopInputDto[];
}

export class CreateTransportVehicleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  registrationNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  vehicleType!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsUUID()
  driverStaffId?: string;
}

export class UpdateTransportVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  vehicleType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  driverStaffId?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateTransportAssignmentDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  routeId!: string;

  @IsUUID()
  stopId!: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveFrom!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveTo?: string;
}

export class EndTransportAssignmentDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveTo!: string;
}
