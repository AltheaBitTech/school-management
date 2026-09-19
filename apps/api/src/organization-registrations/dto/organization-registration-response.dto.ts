import { ApiProperty } from '@nestjs/swagger';

export class OrganizationRegistrationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  message!: string;
}
