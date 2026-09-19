import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class RoleListResponseDto {
  @ApiProperty({ type: [RoleDto] })
  data!: RoleDto[];
}
