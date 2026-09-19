import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class CreateOrganizationRegistrationRequestDto {
  @ApiProperty({ example: 'Delhi Public School' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  organizationName!: string;

  @ApiProperty({ example: 'principal@dps.edu' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(320)
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

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(/^[0-9]{10}$/, { message: 'Phone must be exactly 10 digits' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Plot 123, Main Street' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Delhi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
