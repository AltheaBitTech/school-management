import { ApiProperty } from '@nestjs/swagger';

export class RegistrationSignupContextDto {
  @ApiProperty()
  registrationRequestId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiProperty()
  organizationCode!: string;

  @ApiProperty()
  signupCompleted!: boolean;
}
