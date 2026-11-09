import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim.decorator';
import { VISITOR_MOBILE_PATTERN } from '../../visitors/constants/visitor-mobile.constants';
import { EmploymentStatus } from '@prisma/client';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Priya' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Sharma' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string | null;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Trim()
  @ValidateIf((_, value) => value !== null && value !== undefined && String(value).length > 0)
  @Matches(VISITOR_MOBILE_PATTERN, {
    message: 'Mobile must be a 10-digit Indian mobile number (optional +91 prefix)',
  })
  mobile?: string | null;

  @ApiPropertyOptional({ example: 'priya.sharma@school.example' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string | null;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsOptional()
  @IsDateString()
  joiningDate?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  reportingManagerId?: string | null;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;
}
