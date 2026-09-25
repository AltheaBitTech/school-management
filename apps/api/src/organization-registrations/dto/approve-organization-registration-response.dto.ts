import { ApiProperty } from '@nestjs/swagger';

export class ApproveOrganizationRegistrationResponseDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  organizationCode!: string;

  @ApiProperty()
  adminUserId!: string;

  @ApiProperty()
  adminEmail!: string;

  @ApiProperty()
  completeSignupUrl!: string;
}
