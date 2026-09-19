import { ApiPropertyOptional } from '@nestjs/swagger';
import { FeeStructureStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListFeeStructuresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: FeeStructureStatus })
  @IsOptional()
  @IsEnum(FeeStructureStatus)
  status?: FeeStructureStatus;
}
