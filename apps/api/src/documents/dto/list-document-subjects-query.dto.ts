import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentOwnerType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListDocumentSubjectsQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: DocumentOwnerType })
  @IsEnum(DocumentOwnerType)
  ownerType!: DocumentOwnerType;

  @ApiPropertyOptional({ example: 'adm-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
