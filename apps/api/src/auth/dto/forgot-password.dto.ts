import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'greenwood-high' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  organizationCode!: string;

  @ApiProperty({ example: 'admin@school.example' })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
