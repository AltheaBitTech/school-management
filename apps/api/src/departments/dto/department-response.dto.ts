import { ApiProperty } from '@nestjs/swagger';
import { DepartmentStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class DepartmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty({ enum: DepartmentStatus })
  status!: DepartmentStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class DepartmentResponseDto {
  @ApiProperty({ type: DepartmentDto })
  data!: DepartmentDto;
}

export class PaginatedDepartmentsResponseDto {
  @ApiProperty({ type: [DepartmentDto] })
  data!: DepartmentDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
