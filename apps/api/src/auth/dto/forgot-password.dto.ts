import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@school.example' })
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
