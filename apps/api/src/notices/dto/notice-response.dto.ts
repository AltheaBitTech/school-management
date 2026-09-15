import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoticeAudienceType, NoticeStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class NoticeUserSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;
}

export class NoticeDepartmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;
}

export class NoticeAudienceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NoticeAudienceType })
  audienceType!: NoticeAudienceType;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  departmentId?: string | null;

  @ApiPropertyOptional({ type: NoticeDepartmentSummaryDto, nullable: true })
  department?: NoticeDepartmentSummaryDto | null;
}

export class NoticeReadStateDto {
  @ApiProperty()
  readAt!: string;

  @ApiPropertyOptional({ nullable: true })
  acknowledgedAt?: string | null;
}

export class NoticeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ enum: NoticeStatus })
  status!: NoticeStatus;

  @ApiPropertyOptional({ nullable: true })
  scheduledAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  publishedAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  archivedAt?: string | null;

  @ApiProperty({ format: 'uuid' })
  createdByUserId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional({ type: NoticeUserSummaryDto })
  createdBy?: NoticeUserSummaryDto;

  @ApiProperty({ type: [NoticeAudienceDto] })
  audiences!: NoticeAudienceDto[];

  @ApiPropertyOptional({ type: NoticeReadStateDto, nullable: true })
  readState?: NoticeReadStateDto | null;
}

export class NoticeResponseDto {
  @ApiProperty({ type: NoticeDto })
  data!: NoticeDto;
}

export class PaginatedNoticesResponseDto {
  @ApiProperty({ type: [NoticeDto] })
  data!: NoticeDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
