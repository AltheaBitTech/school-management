import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class UpdateStudentDto extends PartialType(OmitType(CreateStudentDto, ['studentCode'] as const)) {
  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus;
}
