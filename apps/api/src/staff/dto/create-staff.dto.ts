import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
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
import { EMPLOYEE_CODE_PATTERN } from '../constants/staff.constants';

export class CreateStaffDto {
  @ApiProperty({ example: 'emp-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(EMPLOYEE_CODE_PATTERN, {
    message: 'Employee code must be 2-32 lowercase letters, numbers, or hyphens',
  })
  employeeCode!: string;

  @ApiProperty({ example: 'Priya' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Sharma' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Priya Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @Trim()
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @Matches(VISITOR_MOBILE_PATTERN, {
    message: 'Mobile must be a 10-digit Indian mobile number (optional +91 prefix)',
  })
  mobile?: string;

  @ApiProperty({ example: 'priya.sharma@school.example' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  designation?: string;

  @ApiPropertyOptional({ example: '2024-04-01' })
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  reportingManagerId?: string;
}
