import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectOrganizationRegistrationDto {
  @ApiProperty({ example: 'Incomplete documentation provided' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
