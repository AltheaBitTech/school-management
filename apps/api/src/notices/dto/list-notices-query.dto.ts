import { ApiPropertyOptional } from '@nestjs/swagger';
import { NoticeAudienceType, NoticeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListNoticesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: NoticeStatus })
  @IsOptional()
  @IsEnum(NoticeStatus)
  status?: NoticeStatus;

  @ApiPropertyOptional({ enum: NoticeAudienceType })
  @IsOptional()
  @IsEnum(NoticeAudienceType)
  audienceType?: NoticeAudienceType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'meeting' })
  @IsOptional()
  @IsString()
  search?: string;
}
