import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ORGANIZATION_CODE_PATTERN } from '../constants/organization.constants';

export class CreateOrganizationAdminDto {
  @ApiProperty({ example: 'admin@school.example' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Greenwood High School' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    example: 'greenwood-high',
    description: 'Tenant login identifier. Trimmed and lowercased. Pattern: lowercase letters, numbers, hyphens.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Matches(ORGANIZATION_CODE_PATTERN, {
    message: 'Organization code must be 3-64 characters of lowercase letters, numbers, or hyphens',
  })
  code!: string;

  @ApiProperty({ type: CreateOrganizationAdminDto })
  @ValidateNested()
  @Type(() => CreateOrganizationAdminDto)
  admin!: CreateOrganizationAdminDto;
}
