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

  @ApiProperty({ required: false })
  emailSent?: boolean;

  @ApiProperty({ required: false })
  emailError?: { code: string; message: string };
}
