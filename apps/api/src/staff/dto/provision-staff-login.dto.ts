import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class ProvisionStaffLoginDto {
  @ApiProperty({
    description: 'Email for login. Must match staff email or be the staff email.',
    example: 'rajesh.kumar@sunrise-school.test',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ description: 'Role to assign to this user', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;
}
