import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType } from '@prisma/client';

export class TerminologyDto {
  @ApiProperty({ example: 'School' }) institution!: string;
  @ApiProperty({ example: 'Schools' }) institutionPlural!: string;
  @ApiProperty({ example: 'Class' }) unit!: string;
  @ApiProperty({ example: 'Classes' }) unitPlural!: string;
  @ApiProperty({ example: 'Section' }) group!: string;
  @ApiProperty({ example: 'Sections' }) groupPlural!: string;
  @ApiProperty({ example: 'Principal' }) head!: string;
  @ApiProperty({ example: 'Class Teacher' }) groupTeacher!: string;
  @ApiProperty({ example: 'Term' }) term!: string;
  @ApiProperty({ example: 'Terms' }) termPlural!: string;
  @ApiProperty({ example: 'School Admin' }) admin!: string;
}

export class OrganizationSummaryDto {
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

  @ApiProperty({ example: 'UTC' })
  timezone!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  logoFileId?: string | null;
}

export class OrganizationAdminSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  organizationId!: string;
}

export class OrganizationBootstrapDataDto {
  @ApiProperty({ type: OrganizationSummaryDto })
  organization!: OrganizationSummaryDto;

  @ApiProperty({ type: OrganizationAdminSummaryDto })
  admin!: OrganizationAdminSummaryDto;
}

export class OrganizationBootstrapResponseDto {
  @ApiProperty({ type: OrganizationBootstrapDataDto })
  data!: OrganizationBootstrapDataDto;
}

export class OrganizationResponseDto {
  @ApiProperty({ type: OrganizationSummaryDto })
  data!: OrganizationSummaryDto;
}
