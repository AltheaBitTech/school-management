import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import {
  VISITOR_MOBILE_MAX_LENGTH,
  VISITOR_NAME_MAX_LENGTH,
  VISITOR_ORGANIZATION_NAME_MAX_LENGTH,
  VISITOR_PURPOSE_MAX_LENGTH,
  VISITOR_REMARKS_MAX_LENGTH,
  VISITOR_VEHICLE_NUMBER_MAX_LENGTH,
} from '../constants/visitor.constants';

export class CreateVisitorDto {
  @ApiProperty({ example: 'Ramesh Kumar' })
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_MOBILE_MAX_LENGTH)
  mobile!: string;

  @ApiPropertyOptional({ example: 'ABC Services' })
  @IsOptional()
  @IsString()
  @MaxLength(VISITOR_ORGANIZATION_NAME_MAX_LENGTH)
  organizationName?: string;

  @ApiPropertyOptional({ example: 'AP39AB1234' })
  @IsOptional()
  @IsString()
  @MaxLength(VISITOR_VEHICLE_NUMBER_MAX_LENGTH)
  vehicleNumber?: string;

  @ApiProperty({ example: 'Meeting with Principal' })
  @IsString()
  @MinLength(1)
  @MaxLength(VISITOR_PURPOSE_MAX_LENGTH)
  purpose!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hostStaffId!: string;

  @ApiPropertyOptional({ example: 'Vendor representative' })
  @IsOptional()
  @IsString()
  @MaxLength(VISITOR_REMARKS_MAX_LENGTH)
  remarks?: string;
}
