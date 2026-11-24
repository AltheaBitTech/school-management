import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalAction,
  ApprovalActionType,
  ApprovalEntityType,
  ApprovalLevel,
  ApprovalRequest,
  ApprovalRequestStatus,
  Prisma,
} from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApproverResolutionService } from './approver-resolution.service';
import {
  APPROVAL_ERROR_CODES,
  DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE,
} from './constants/approval.constants';
import { ListApprovalRequestsQueryDto } from './dto/approval.dto';
import { ApprovalActionDto, ApprovalRequestDto } from './dto/approval-response.dto';

type ApprovalRequestWithWorkflow = ApprovalRequest & {
  workflow: {
    id: string;
    code: string;
    name: string;
    levels: ApprovalLevel[];
  };
};

const requestInclude = {
  workflow: {
    select: {
      id: true,
      code: true,
      name: true,
      levels: {
        orderBy: { level: 'asc' as const },
      },
    },
  },
} as const;

@Injectable()
export class ApprovalRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approverResolutionService: ApproverResolutionService,
  ) {}

  async list(organizationId: string, query: ListApprovalRequestsQueryDto) {
    const where: Prisma.ApprovalRequestWhereInput = {
      organizationId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.status ? { status: query.status as ApprovalRequestStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.approvalRequest.findMany({
        where,
        include: requestInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.approvalRequest.count({ where }),
    ]);

    return {
      data: await Promise.all(items.map((item) => this.toDto(item))),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, approvalRequestId: string): Promise<ApprovalRequestWithWorkflow> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: approvalRequestId, organizationId },
      include: requestInclude,
    });

    if (!request) {
      throw new NotFoundException({
        code: APPROVAL_ERROR_CODES.APPROVAL_NOT_FOUND,
        message: 'Approval request not found',
      });
    }

    return request;
  }

  async getHistory(organizationId: string, approvalRequestId: string): Promise<ApprovalAction[]> {
    await this.findById(organizationId, approvalRequestId);

    return this.prisma.approvalAction.findMany({
      where: { approvalRequestId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async createForEntity(
    tx: Prisma.TransactionClient,
    params: {
      organizationId: string;
      entityType: ApprovalEntityType;
      entityId: string;
      submittedById: string;
      workflowCode?: string;
    },
  ): Promise<ApprovalRequest> {
    const workflow = await tx.approvalWorkflow.findFirst({
      where: {
        organizationId: params.organizationId,
        code: params.workflowCode ?? DEFAULT_LEAVE_APPROVAL_WORKFLOW_CODE,
        entityType: params.entityType,
        isActive: true,
      },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    if (!workflow) {
      throw new BadRequestException({
        code: APPROVAL_ERROR_CODES.APPROVAL_WORKFLOW_NOT_FOUND,
        message: 'No active approval workflow is configured for this entity type',
      });
    }

    if (workflow.levels.length === 0) {
      throw new BadRequestException({
        code: APPROVAL_ERROR_CODES.APPROVAL_LEVEL_NOT_CONFIGURED,
        message: 'Approval workflow has no configured levels',
      });
    }

    const existing = await tx.approvalRequest.findFirst({
      where: {
        organizationId: params.organizationId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    if (existing) {
      throw new ConflictException({
        code: APPROVAL_ERROR_CODES.APPROVAL_DUPLICATE_REQUEST,
        message: 'An approval request already exists for this entity',
      });
    }

    const request = await tx.approvalRequest.create({
      data: {
        organizationId: params.organizationId,
        workflowId: workflow.id,
        entityType: params.entityType,
        entityId: params.entityId,
        status: ApprovalRequestStatus.PENDING,
        currentLevel: 1,
        submittedById: params.submittedById,
      },
    });

    await tx.approvalAction.create({
      data: {
        approvalRequestId: request.id,
        level: 0,
        action: ApprovalActionType.SUBMITTED,
        actorUserId: params.submittedById,
      },
    });

    return request;
  }

  async toDto(request: ApprovalRequestWithWorkflow): Promise<ApprovalRequestDto> {
    const currentLevel = request.workflow.levels.find((level) => level.level === request.currentLevel);
    let currentApproverSummary: string | null = null;
    let currentApproverRoleCode: string | null = null;
    let currentApproverUserId: string | null = null;

    if (currentLevel && request.status === ApprovalRequestStatus.PENDING) {
      const summary = await this.approverResolutionService.resolveLevelApproverSummary(
        this.prisma,
        request.organizationId,
        currentLevel,
      );

      if (summary.type === 'ROLE') {
        currentApproverSummary = summary.roleName ? `Role: ${summary.roleName}` : 'Role approver';
        currentApproverRoleCode = summary.roleCode ?? null;
      } else if (summary.userEmail) {
        currentApproverSummary = `User: ${summary.userEmail}`;
        currentApproverUserId = summary.userId ?? null;
      }
    }

    return {
      id: request.id,
      workflowId: request.workflowId,
      entityType: request.entityType,
      entityId: request.entityId,
      status: request.status,
      currentLevel: request.currentLevel,
      submittedById: request.submittedById,
      completedAt: request.completedAt?.toISOString() ?? null,
      currentLevelName: currentLevel?.name ?? null,
      currentApproverSummary,
      currentApproverRoleCode,
      currentApproverUserId,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  actionToDto(action: ApprovalAction): ApprovalActionDto {
    return {
      id: action.id,
      level: action.level,
      action: action.action,
      actorUserId: action.actorUserId,
      comment: action.comment,
      createdAt: action.createdAt.toISOString(),
    };
  }
}
