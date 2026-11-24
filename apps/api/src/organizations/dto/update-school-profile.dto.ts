import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms/trim.decorator';

export class UpdateSchoolProfileDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @Trim()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
