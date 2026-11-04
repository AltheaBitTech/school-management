import { ApiProperty } from '@nestjs/swagger';
import { StaffDto } from './staff-response.dto';

export class ProvisionStaffLoginDataDto {
  @ApiProperty({ type: StaffDto })
  staff!: StaffDto;

  @ApiProperty({ example: 'rajesh.kumar@sunrise-school.test' })
  loginEmail!: string;

  @ApiProperty()
  inviteUrl!: string;

  @ApiProperty()
  inviteExpiresAt!: string;
}

export class ProvisionStaffLoginResponseDto {
  @ApiProperty({ type: ProvisionStaffLoginDataDto })
  data!: ProvisionStaffLoginDataDto;
}
