import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ProvisionStudentLoginDto {
  @ApiProperty({ example: 'aarav.sharma@sunrise-school.test' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(254)
  email!: string;
}
