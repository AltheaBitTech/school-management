import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  organizationId!: string;
}

export class LoginRoleOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class AuthDataDto {
  @ApiPropertyOptional()
  accessToken?: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;

  @ApiPropertyOptional({ type: AuthUserDto })
  user?: AuthUserDto;

  @ApiPropertyOptional()
  contextSelectionRequired?: boolean;

  @ApiPropertyOptional()
  selectionToken?: string;

  @ApiPropertyOptional({ type: [LoginRoleOptionDto] })
  roles?: LoginRoleOptionDto[];
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthDataDto })
  data!: AuthDataDto;
}
