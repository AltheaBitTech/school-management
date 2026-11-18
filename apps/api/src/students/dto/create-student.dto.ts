import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim.decorator';
import { VISITOR_MOBILE_PATTERN } from '../../visitors/constants/visitor-mobile.constants';
import { ROLL_NUMBER_PATTERN } from '../utils/student-profile.util';

export class CreateStudentDto {
  @ApiProperty({ example: 'adm-2026-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  studentCode!: string;

  @ApiProperty({ example: 'Aarav' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Sharma' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: 'Aarav Sharma' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: '2012-05-10' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Grade 8-A' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  className?: string;

  @ApiPropertyOptional({
    description: 'Section ID from Classes & Sections. Preferred over studentClass/section.',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiPropertyOptional({
    example: 'Grade 8',
    description: 'Legacy: class name. Must match an existing class when sectionId is not sent.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  studentClass?: string;

  @ApiPropertyOptional({
    example: 'A',
    description: 'Legacy: section name. Must match an existing section when sectionId is not sent.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  section?: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Matches(ROLL_NUMBER_PATTERN, {
    message: 'Roll number must be 1–10 letters, numbers, or hyphens',
  })
  rollNumber!: string;

  @ApiProperty({ example: 'Rajesh Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  guardianName!: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(VISITOR_MOBILE_PATTERN, {
    message: 'Guardian phone must be a 10-digit Indian mobile number (optional +91 prefix)',
  })
  guardianPhone!: string;

  @ApiProperty({ example: '2025-2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(9)
  @Matches(/^\d{4}-\d{4}$/, {
    message: 'Academic year must look like 2025-2026',
  })
  academicYear!: string;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    description: 'Current term/semester number (colleges and institutes)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  currentTerm?: number | null;
}
