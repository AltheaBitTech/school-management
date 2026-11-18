import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionType } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ORGANIZATION_CODE_PATTERN } from '../../organizations/constants/organization.constants';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function normalizeOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePhoneDigits(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

export class CreateOrganizationRegistrationRequestDto {
  @ApiProperty({ example: 'Delhi Public School' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  organizationName!: string;

  @ApiPropertyOptional({ enum: InstitutionType, default: InstitutionType.SCHOOL })
  @IsOptional()
  @IsEnum(InstitutionType)
  institutionType?: InstitutionType;

  @ApiPropertyOptional({
    example: 'delhi-public-school',
    description: 'Preferred login code for your institution (lowercase letters, numbers, hyphens)',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @Matches(ORGANIZATION_CODE_PATTERN, {
    message: 'Institution code must be 3-64 characters of lowercase letters, numbers, or hyphens',
  })
  preferredOrganizationCode?: string;

  @ApiProperty({ example: 'principal@dps.edu' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }) => normalizeEmail(value))
  contactEmail!: string;

  @ApiProperty({ example: 'Rajesh' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactFirstName!: string;

  @ApiProperty({ example: 'Kumar' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactLastName!: string;

  @ApiProperty({ example: '9876543210', description: '10-digit Indian mobile number' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Transform(({ value }) => normalizePhoneDigits(value))
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  contactPhone!: string;

  @ApiPropertyOptional({ example: 'Plot 123, Main Street' })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiProperty({
    minLength: 8,
    description: 'Password for the institution administrator account (used after approval)',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
