import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitorStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { VISITOR_DATE_PATTERN } from '../constants/visitor.constants';

export class ListVisitorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VisitorStatus })
  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;

  @ApiPropertyOptional({ example: '2026-09-16' })
  @IsOptional()
  @IsString()
  @Matches(VISITOR_DATE_PATTERN)
  date?: string;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsString()
  @Matches(VISITOR_DATE_PATTERN)
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
  @IsOptional()
  @IsString()
  @Matches(VISITOR_DATE_PATTERN)
  toDate?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  hostStaffId?: string;

  @ApiPropertyOptional({ example: 'Ramesh' })
  @IsOptional()
  @IsString()
  search?: string;
}
