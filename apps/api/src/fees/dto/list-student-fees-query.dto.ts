import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentFeeStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListStudentFeesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  feeStructureId?: string;

  @ApiPropertyOptional({ enum: StudentFeeStatus })
  @IsOptional()
  @IsEnum(StudentFeeStatus)
  status?: StudentFeeStatus;
}
