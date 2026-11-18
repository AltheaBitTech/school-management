import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType } from '@prisma/client';
import { TerminologyDto } from '../../organizations/dto/organization-response.dto';

export class MeOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ enum: InstitutionType, example: InstitutionType.SCHOOL })
  institutionType!: InstitutionType;

  @ApiProperty({ type: TerminologyDto })
  terminology!: TerminologyDto;
}

export class MeStaffDto {
  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;
}

export class MeRoleDto {
  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  code?: string;
}

export class MeFeaturesDto {
  @ApiProperty({ description: 'When false, attendance modules and APIs are disabled' })
  attendanceEnabled!: boolean;
}

export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty({ type: MeOrganizationDto })
  organization!: MeOrganizationDto;

  @ApiProperty({ type: [String], description: 'Effective permission codes for the current user' })
  permissions!: string[];

  @ApiPropertyOptional({ type: MeStaffDto })
  staff?: MeStaffDto;

  @ApiPropertyOptional({ type: MeRoleDto })
  role?: MeRoleDto;

  @ApiPropertyOptional({ format: 'uuid', description: 'Linked student record when present' })
  studentId?: string;

  @ApiProperty({ type: MeFeaturesDto })
  features!: MeFeaturesDto;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  data!: MeUserDto;
}
