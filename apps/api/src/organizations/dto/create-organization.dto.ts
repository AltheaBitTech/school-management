import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ORGANIZATION_CODE_PATTERN } from '../constants/organization.constants';

export class CreateOrganizationAdminDto {
  @ApiProperty({ example: 'admin@institution.example' })
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
  @ApiProperty({ example: 'Greenwood Academy' })
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

  @ApiPropertyOptional({ enum: InstitutionType, default: InstitutionType.SCHOOL })
  @IsOptional()
  @IsEnum(InstitutionType)
  institutionType?: InstitutionType;

  @ApiProperty({ type: CreateOrganizationAdminDto })
  @ValidateNested()
  @Type(() => CreateOrganizationAdminDto)
  admin!: CreateOrganizationAdminDto;
}
