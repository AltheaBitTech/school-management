import { ApiProperty } from '@nestjs/swagger';
import { StaffDto } from './staff-response.dto';

export class ProvisionStaffLoginDataDto {
  @ApiProperty({ type: StaffDto })
  staff!: StaffDto;

  @ApiProperty({ example: 'rajesh.kumar@sunrise-school.test' })
  loginEmail!: string;

  @ApiProperty({ description: 'Present when the email was not delivered, or when the server is in console mode.' })
  inviteUrl!: string;

  @ApiProperty()
  inviteExpiresAt!: string;

  @ApiProperty()
  emailSent!: boolean;

  @ApiProperty({ required: false })
  emailError?: { code: string; message: string };

  @ApiProperty({ required: false })
  deliveryNote?: string;
}

export class ProvisionStaffLoginResponseDto {
  @ApiProperty({ type: ProvisionStaffLoginDataDto })
  data!: ProvisionStaffLoginDataDto;
}
