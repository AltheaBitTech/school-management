import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Built-in role seeded by the system' })
  isSystem!: boolean;

  @ApiProperty({ description: 'Built-in role whose permissions were edited by an admin' })
  isCustomized!: boolean;

  @ApiProperty({ description: 'Role permissions cannot be edited (School Admin)' })
  isLocked!: boolean;

  @ApiProperty()
  permissionCount!: number;

  @ApiProperty()
  userCount!: number;
}

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleDto] })
  data!: RoleDto[];
}

export class RoleDetailDto extends RoleDto {
  @ApiProperty({ type: [String] })
  permissions!: string[];
}

export class RoleDetailResponseDto {
  @ApiProperty({ type: RoleDetailDto })
  data!: RoleDetailDto;
}

export class PermissionCatalogEntryDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  description!: string;
}

export class PermissionCatalogGroupDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: [PermissionCatalogEntryDto] })
  permissions!: PermissionCatalogEntryDto[];
}

export class PermissionCatalogResponseDto {
  @ApiProperty({ type: [PermissionCatalogGroupDto] })
  data!: PermissionCatalogGroupDto[];
}
