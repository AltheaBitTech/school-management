import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(4000)
  body!: string;
}
