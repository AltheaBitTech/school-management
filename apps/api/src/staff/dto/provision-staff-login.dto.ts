import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ProvisionStaffLoginDto {
  @ApiProperty({ example: 'rajesh.kumar@sunrise-school.test' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'TemporaryPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId!: string;
}
