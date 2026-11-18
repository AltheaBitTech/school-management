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

  @ApiProperty({
    description: 'When true, the applicant chose a password at registration and can sign in immediately.',
  })
  signupPreCompleted!: boolean;

  @ApiProperty({ description: 'Sign-in URL for the new institution (primary handoff when signupPreCompleted is true).' })
  loginUrl!: string;

  @ApiProperty({
    required: false,
    description: 'Legacy link to set a password when signupPreCompleted is false.',
  })
  completeSignupUrl?: string;
}
