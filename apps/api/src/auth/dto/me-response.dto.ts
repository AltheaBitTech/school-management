import { ApiProperty } from '@nestjs/swagger';

export class MeOrganizationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
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
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  data!: MeUserDto;
}
