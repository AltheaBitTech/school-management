import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class StudentResponseDto {
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
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  className?: string | null;

  @ApiProperty({ enum: StudentStatus })
  status!: StudentStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedStudentsResponseDto {
  @ApiProperty({ type: [StudentResponseDto] })
  data!: StudentResponseDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}
