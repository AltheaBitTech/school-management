import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

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
