import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListStudentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;

  @ApiPropertyOptional({ description: 'Search by name or student code' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by class (studentClass field)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentClass?: string;

  @ApiPropertyOptional({ description: 'Filter by section' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  section?: string;

  @ApiPropertyOptional({ description: 'Filter by class ID' })
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filter by section ID' })
  @IsOptional()
  @IsUUID()
  sectionId?: string;
}
