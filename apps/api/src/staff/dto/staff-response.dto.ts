import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class StaffDepartmentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class StaffRoleSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class StaffDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userId?: string | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  mobile?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  departmentId?: string | null;

  @ApiPropertyOptional()
  designation?: string | null;

  @ApiPropertyOptional()
  joiningDate?: string | null;

  @ApiPropertyOptional()
  lastWorkingDate?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  reportingManagerId?: string | null;

  @ApiProperty({ enum: EmploymentStatus })
  employmentStatus!: EmploymentStatus;

  @ApiPropertyOptional({ type: StaffDepartmentSummaryDto })
  department?: StaffDepartmentSummaryDto | null;

  @ApiPropertyOptional({ type: StaffRoleSummaryDto })
  loginRole?: StaffRoleSummaryDto | null;

  @ApiPropertyOptional({ type: [StaffRoleSummaryDto] })
  loginRoles?: StaffRoleSummaryDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class StaffResponseDto {
  @ApiProperty({ type: StaffDto })
  data!: StaffDto;
}

export class PaginatedStaffResponseDto {
  @ApiProperty({ type: [StaffDto] })
  data!: StaffDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
