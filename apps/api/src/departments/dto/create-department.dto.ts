import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { DEPARTMENT_CODE_PATTERN } from '../constants/department.constants';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Teaching' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'teaching' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(DEPARTMENT_CODE_PATTERN, {
    message: 'Department code must be 2-32 lowercase letters, numbers, or hyphens',
  })
  code!: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'Teaching Department' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
}
