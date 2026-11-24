import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ATTENDANCE_DATE_PATTERN } from '../../attendance/constants/attendance.constants';
import {
  STUDENT_ATTENDANCE_STATUSES,
  type StudentAttendanceStatus,
} from '../constants/student-attendance.constants';

const DATE_MESSAGE = 'Date must use YYYY-MM-DD format';

export class StudentAttendanceDateQueryDto {
  @ApiPropertyOptional({ example: '2026-11-18', description: 'Defaults to today in the institution timezone' })
  @IsOptional()
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  date?: string;
}

export class StudentAttendanceHistoryQueryDto {
  @ApiPropertyOptional({ example: '2026-10-20', description: 'Defaults to 30 days before `to`' })
  @IsOptional()
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  from?: string;

  @ApiPropertyOptional({ example: '2026-11-18', description: 'Defaults to today in the institution timezone' })
  @IsOptional()
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  to?: string;
}

export class StudentAttendanceEntryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: STUDENT_ATTENDANCE_STATUSES })
  @IsIn(STUDENT_ATTENDANCE_STATUSES)
  status!: StudentAttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}

export class SaveSectionAttendanceDto {
  @ApiProperty({ example: '2026-11-18' })
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  attendanceDate!: string;

  @ApiProperty({ type: [StudentAttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceEntryDto)
  entries!: StudentAttendanceEntryDto[];
}

export class CreateSectionSubstituteDto {
  @ApiProperty({ format: 'uuid', description: 'Staff member who will take attendance' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({ example: '2026-11-18' })
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  fromDate!: string;

  @ApiProperty({ example: '2026-11-20' })
  @Matches(ATTENDANCE_DATE_PATTERN, { message: DATE_MESSAGE })
  toDate!: string;

  @ApiPropertyOptional({ example: 'Class teacher on leave' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
