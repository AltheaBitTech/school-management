import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateComplaintDto {
  @ApiProperty({ example: 'Broken projector in Room 12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'The projector does not turn on during morning classes.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @ApiProperty({ enum: ComplaintCategory, example: ComplaintCategory.IT })
  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @ApiProperty({ enum: ComplaintPriority, example: ComplaintPriority.HIGH })
  @IsEnum(ComplaintPriority)
  priority!: ComplaintPriority;

  @ApiPropertyOptional({ example: 'Room 12, Block A' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class UpdateComplaintDto {
  @ApiPropertyOptional({ example: 'Broken projector in Room 12' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description with more detail.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ enum: ComplaintCategory })
  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiPropertyOptional({ example: 'Room 12, Block A' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class AssignComplaintDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  assignedToStaffId!: string;
}

export class ChangeComplaintStatusDto {
  @ApiProperty({ enum: ComplaintStatus, example: ComplaintStatus.IN_PROGRESS })
  @IsEnum(ComplaintStatus)
  status!: ComplaintStatus;
}

export class AddComplaintCommentDto {
  @ApiProperty({ example: 'Technician scheduled for tomorrow morning.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  comment!: string;
}
