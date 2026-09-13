import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { STAFF_SORT_FIELDS } from '../constants/staff.constants';

export class ListStaffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'priya' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: STAFF_SORT_FIELDS, default: 'firstName' })
  @IsOptional()
  @IsIn(STAFF_SORT_FIELDS)
  sortBy: (typeof STAFF_SORT_FIELDS)[number] = 'firstName';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;
}
