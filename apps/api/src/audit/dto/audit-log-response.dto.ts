import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  actorUserId!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;

  @ApiPropertyOptional()
  requestId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  before?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  after?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogRowDto] })
  data!: AuditLogRowDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
