import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOnboardingSetupDto {
  @ApiPropertyOptional({ example: 'Sunrise Public School' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  organizationName?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezone?: string;
}
