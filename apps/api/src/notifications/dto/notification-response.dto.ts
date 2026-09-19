import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { NotificationEventKey } from '../constants/notification.constants';

export class NotificationRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty()
  eventKey!: NotificationEventKey;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiPropertyOptional()
  readAt?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  requestId?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationRowDto] })
  data!: NotificationRowDto[];

  @ApiProperty()
  meta!: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class NotificationResponseDto {
  @ApiProperty({ type: NotificationRowDto })
  data!: NotificationRowDto;
}
