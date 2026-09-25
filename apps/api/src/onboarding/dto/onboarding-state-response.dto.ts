import { ApiProperty } from '@nestjs/swagger';

export class OnboardingStateDto {
  @ApiProperty()
  onboardingCompleted!: boolean;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  organizationName!: string;

  @ApiProperty()
  organizationCode!: string;

  @ApiProperty({ example: 'UTC' })
  timezone!: string;
}

export class OnboardingStateResponseDto {
  @ApiProperty({ type: OnboardingStateDto })
  data!: OnboardingStateDto;
}
