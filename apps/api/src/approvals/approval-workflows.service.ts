import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalLevel, ApprovalWorkflow } from '@prisma/client';
import { buildPaginationMeta, PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { APPROVAL_ERROR_CODES } from './constants/approval.constants';
import { CreateApprovalWorkflowDto, UpdateApprovalWorkflowDto } from './dto/approval.dto';
import { ApprovalWorkflowDto } from './dto/approval-response.dto';

type WorkflowWithLevels = ApprovalWorkflow & { levels: ApprovalLevel[] };

@Injectable()
export class ApprovalWorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: PaginationQueryDto) {
    const where = { organizationId };

    const [items, total] = await Promise.all([
      this.prisma.approvalWorkflow.findMany({
        where,
        include: { levels: { orderBy: { level: 'asc' } } },
        orderBy: [{ name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.approvalWorkflow.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, workflowId: string): Promise<WorkflowWithLevels> {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId },
      include: { levels: { orderBy: { level: 'asc' } } },
    });

    if (!workflow) {
      throw new NotFoundException({
        code: APPROVAL_ERROR_CODES.APPROVAL_WORKFLOW_NOT_FOUND,
        message: 'Approval workflow not found',
      });
    }

    return workflow;
  }

  async create(organizationId: string, dto: CreateApprovalWorkflowDto): Promise<WorkflowWithLevels> {
    return this.prisma.approvalWorkflow.create({
      data: {
        organizationId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        entityType: dto.entityType,
        isActive: true,
        levels: {
          create: dto.levels.map((level) => ({
            level: level.level,
            name: level.name.trim(),
            approverType: level.approverType,
            roleId: level.roleId ?? null,
            userId: level.userId ?? null,
          })),
        },
      },
      include: { levels: { orderBy: { level: 'asc' } } },
    });
  }

  async update(
    organizationId: string,
    workflowId: string,
    dto: UpdateApprovalWorkflowDto,
  ): Promise<WorkflowWithLevels> {
    await this.findById(organizationId, workflowId);

    return this.prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { levels: { orderBy: { level: 'asc' } } },
    });
  }

  toDto(workflow: WorkflowWithLevels): ApprovalWorkflowDto {
    return {
      id: workflow.id,
      code: workflow.code,
      name: workflow.name,
      description: workflow.description,
      entityType: workflow.entityType,
      isActive: workflow.isActive,
      levels: workflow.levels.map((level) => ({
        id: level.id,
        level: level.level,
        name: level.name,
        approverType: level.approverType,
        roleId: level.roleId,
        userId: level.userId,
      })),
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }
}
