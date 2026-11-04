import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentSettingsDto {
  @IsBoolean()
  showPhoto!: boolean;

  @IsBoolean()
  showCode!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  footerLine?: string;
}
