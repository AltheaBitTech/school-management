import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class AttendanceStaffSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  departmentId?: string | null;
}

export class AttendanceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  staffId!: string;

  @ApiProperty({ example: '2026-09-12' })
  attendanceDate!: string;

  @ApiPropertyOptional()
  checkInAt?: string | null;

  @ApiPropertyOptional()
  checkOutAt?: string | null;

  @ApiProperty({ enum: AttendanceStatus })
  status!: AttendanceStatus;

  @ApiProperty()
  lateFlag!: boolean;

  @ApiProperty()
  earlyDepartureFlag!: boolean;

  @ApiPropertyOptional()
  remarks?: string | null;

  @ApiPropertyOptional({ type: AttendanceStaffSummaryDto })
  staff?: AttendanceStaffSummaryDto;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class AttendanceResponseDto {
  @ApiProperty({ type: AttendanceDto })
  data!: AttendanceDto;
}

export class PaginatedAttendanceResponseDto {
  @ApiProperty({ type: [AttendanceDto] })
  data!: AttendanceDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
