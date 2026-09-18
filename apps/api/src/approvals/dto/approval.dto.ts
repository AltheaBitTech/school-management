import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalApproverType, ApprovalEntityType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreateApprovalLevelDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  level!: number;

  @ApiProperty({ example: 'School Admin Approval' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ApprovalApproverType })
  @IsEnum(ApprovalApproverType)
  approverType!: ApprovalApproverType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CreateApprovalWorkflowDto {
  @ApiProperty({ example: 'LEAVE_APPROVAL' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Leave Approval' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ApprovalEntityType })
  @IsEnum(ApprovalEntityType)
  entityType!: ApprovalEntityType;

  @ApiProperty({ type: [CreateApprovalLevelDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalLevelDto)
  levels!: CreateApprovalLevelDto[];
}

export class UpdateApprovalWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListApprovalRequestsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ApprovalEntityType })
  @IsOptional()
  @IsEnum(ApprovalEntityType)
  entityType?: ApprovalEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ApprovalDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
