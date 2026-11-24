import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalActionType,
  ApprovalApproverType,
  ApprovalEntityType,
  ApprovalRequestStatus,
} from '@prisma/client';
import { PaginationMeta } from '../../common/dto/pagination-query.dto';

export class ApprovalLevelDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ApprovalApproverType })
  approverType!: ApprovalApproverType;

  @ApiPropertyOptional()
  roleId?: string | null;

  @ApiPropertyOptional()
  userId?: string | null;
}

export class ApprovalWorkflowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: ApprovalEntityType })
  entityType!: ApprovalEntityType;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [ApprovalLevelDto] })
  levels!: ApprovalLevelDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApprovalActionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  level!: number;

  @ApiProperty({ enum: ApprovalActionType })
  action!: ApprovalActionType;

  @ApiProperty()
  actorUserId!: string;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class ApprovalRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workflowId!: string;

  @ApiProperty({ enum: ApprovalEntityType })
  entityType!: ApprovalEntityType;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: ApprovalRequestStatus })
  status!: ApprovalRequestStatus;

  @ApiProperty()
  currentLevel!: number;

  @ApiProperty()
  submittedById!: string;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiPropertyOptional()
  currentLevelName?: string | null;

  @ApiPropertyOptional()
  currentApproverSummary?: string | null;

  @ApiPropertyOptional({ description: 'Role code required when the current level is assigned to a role' })
  currentApproverRoleCode?: string | null;

  @ApiPropertyOptional({ description: 'User id required when the current level is assigned to a person' })
  currentApproverUserId?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApprovalRequestResponseDto {
  @ApiProperty({ type: ApprovalRequestDto })
  data!: ApprovalRequestDto;
}

export class PaginatedApprovalRequestsResponseDto {
  @ApiProperty({ type: [ApprovalRequestDto] })
  data!: ApprovalRequestDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class ApprovalWorkflowResponseDto {
  @ApiProperty({ type: ApprovalWorkflowDto })
  data!: ApprovalWorkflowDto;
}

export class PaginatedApprovalWorkflowsResponseDto {
  @ApiProperty({ type: [ApprovalWorkflowDto] })
  data!: ApprovalWorkflowDto[];

  @ApiProperty()
  meta!: PaginationMeta;
}

export class ApprovalHistoryResponseDto {
  @ApiProperty({ type: [ApprovalActionDto] })
  data!: ApprovalActionDto[];
}
