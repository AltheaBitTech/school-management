import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DocumentOwnerType,
  DocumentType,
  GeneratedDocumentStatus,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class GeneratedDocumentStudentSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  studentCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  className?: string | null;
}

export class GeneratedDocumentStaffSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  employeeCode!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  designation?: string | null;
}

export class GeneratedDocumentVisitorSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  visitorCode!: string;

  @ApiProperty()
  name!: string;
}

export class GeneratedDocumentUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;
}

export class GeneratedDocumentFileSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  size!: number;
}

export class GeneratedDocumentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DocumentType })
  documentType!: DocumentType;

  @ApiProperty({ enum: DocumentOwnerType })
  ownerType!: DocumentOwnerType;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  templateId!: string;

  @ApiProperty()
  templateVersion!: number;

  @ApiProperty({ enum: GeneratedDocumentStatus })
  status!: GeneratedDocumentStatus;

  @ApiProperty()
  generatedByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ type: GeneratedDocumentStudentSummaryDto })
  student?: GeneratedDocumentStudentSummaryDto;

  @ApiPropertyOptional({ type: GeneratedDocumentStaffSummaryDto })
  staff?: GeneratedDocumentStaffSummaryDto;

  @ApiPropertyOptional({ type: GeneratedDocumentVisitorSummaryDto })
  visitor?: GeneratedDocumentVisitorSummaryDto;

  @ApiPropertyOptional({ type: GeneratedDocumentUserSummaryDto })
  generatedBy?: GeneratedDocumentUserSummaryDto;

  @ApiPropertyOptional({ type: GeneratedDocumentFileSummaryDto })
  file?: GeneratedDocumentFileSummaryDto;
}

export class PaginatedGeneratedDocumentsResponseDto {
  @ApiProperty({ type: [GeneratedDocumentResponseDto] })
  data!: GeneratedDocumentResponseDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class GeneratedDocumentDetailResponseDto {
  @ApiProperty({ type: GeneratedDocumentResponseDto })
  data!: GeneratedDocumentResponseDto;
}
