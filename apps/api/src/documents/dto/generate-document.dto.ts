import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class GenerateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @ApiProperty({ description: 'Student, staff, or visitor ID depending on document type' })
  @IsUUID()
  ownerId!: string;

  @ApiPropertyOptional({ description: 'Purpose for bonafide or character certificates' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Conduct rating for character certificate' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  conduct?: string;

  @ApiPropertyOptional({ description: 'Monthly gross salary for salary certificate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryAmount?: number;

  @ApiPropertyOptional({ description: 'Salary month in YYYY-MM format' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  salaryMonth?: string;

  @ApiPropertyOptional({ description: 'Reason for relieving on experience letter' })
  @IsOptional()
  @IsString()
  relievingReason?: string;

  @ApiPropertyOptional({ description: 'Last working date for experience letter' })
  @IsOptional()
  @IsDateString()
  leavingDate?: string;
}
