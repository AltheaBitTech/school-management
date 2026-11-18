import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transforms/trim.decorator';
import { CLASS_NAME_MAX_LENGTH, SECTION_NAME_MAX_LENGTH } from '../constants/class.constants';

export class CreateClassDto {
  @ApiProperty({ example: 'Grade 8' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CLASS_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ example: 8, description: 'Sort order in lists (lower first)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder?: number;
  @ApiPropertyOptional({ example: 8, description: 'Number of terms/semesters (college/institute programs)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  termCount?: number;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ example: 'Grade 8' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CLASS_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder?: number;

  @ApiPropertyOptional({ example: 8, nullable: true, description: 'Number of terms/semesters; null to clear' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  termCount?: number | null;
}

export class CreateSectionDto {
  @ApiProperty({ example: 'A' })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SECTION_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ description: 'Staff ID of the class teacher' })
  @IsOptional()
  @IsUUID()
  classTeacherId?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number;
}

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(SECTION_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: 'Staff ID of the class teacher; null to clear', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  classTeacherId?: string | null;

  @ApiPropertyOptional({ example: 40, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;
}

export class ListClassesQueryDto {
  @ApiPropertyOptional({ enum: ClassStatus, description: 'Defaults to all statuses' })
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;
}

export class SectionDto {
  @ApiProperty() id!: string;
  @ApiProperty() classId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ClassStatus }) status!: ClassStatus;
  @ApiPropertyOptional({ nullable: true }) capacity!: number | null;
  @ApiPropertyOptional({ nullable: true }) classTeacherId!: string | null;
  @ApiPropertyOptional({ nullable: true }) classTeacherName!: string | null;
  @ApiProperty() studentCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ClassDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() displayOrder!: number;
  @ApiPropertyOptional({ nullable: true }) termCount!: number | null;
  @ApiProperty({ enum: ClassStatus }) status!: ClassStatus;
  @ApiProperty({ type: [SectionDto] }) sections!: SectionDto[];
  @ApiProperty() studentCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class ClassResponseDto {
  @ApiProperty({ type: ClassDto }) data!: ClassDto;
}

export class ClassListResponseDto {
  @ApiProperty({ type: [ClassDto] }) data!: ClassDto[];
}

export class SectionResponseDto {
  @ApiProperty({ type: SectionDto }) data!: SectionDto;
}
