import { BadRequestException, Injectable } from '@nestjs/common';
import { ApprovalEntityType, ApprovalRequestStatus, Prisma } from '@prisma/client';
import { ApprovalRequestsService } from '../approvals/approval-requests.service';
import {
  BUDGET_APPROVAL_WORKFLOW_CODE,
  MAINTENANCE_APPROVAL_WORKFLOW_CODE,
  PURCHASE_APPROVAL_WORKFLOW_CODE,
} from '../approvals/constants/approval.constants';
import { ensureDefaultOperationalApprovalWorkflows } from '../approvals/utils/approval-workflow-seed.util';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PrismaService } from '../prisma/prisma.service';

const WORKFLOW_BY_TYPE: Record<string, string> = {
  [ApprovalEntityType.MAINTENANCE]: MAINTENANCE_APPROVAL_WORKFLOW_CODE,
  [ApprovalEntityType.PURCHASE]: PURCHASE_APPROVAL_WORKFLOW_CODE,
  [ApprovalEntityType.BUDGET]: BUDGET_APPROVAL_WORKFLOW_CODE,
};

@Injectable()
export class OperationalRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalRequestsService: ApprovalRequestsService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.operationalRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { submittedBy: { select: { id: true, email: true } } },
    });
    return { data: rows.map(toDto) };
  }

  async create(
    user: AuthenticatedUser,
    input: { requestType: ApprovalEntityType; title: string; description: string; amount?: number },
  ) {
    if (!WORKFLOW_BY_TYPE[input.requestType]) {
      throw new BadRequestException({
        code: 'OPERATIONAL_REQUEST_TYPE_INVALID',
        message: 'Request type must be maintenance, purchase, or budget',
      });
    }

    await ensureDefaultOperationalApprovalWorkflows(this.prisma, user.organizationId);

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.operationalRequest.create({
        data: {
          organizationId: user.organizationId,
          requestType: input.requestType,
          title: input.title.trim(),
          description: input.description.trim(),
          amount: input.amount ?? null,
          submittedById: user.userId,
          status: ApprovalRequestStatus.PENDING,
        },
      });

      await this.approvalRequestsService.createForEntity(tx, {
        organizationId: user.organizationId,
        entityType: input.requestType,
        entityId: request.id,
        submittedById: user.userId,
        workflowCode: WORKFLOW_BY_TYPE[input.requestType],
      });

      return request;
    });

    return { data: toDto(created) };
  }
}

function toDto(row: {
  id: string;
  requestType: ApprovalEntityType;
  title: string;
  description: string;
  amount: Prisma.Decimal | null;
  status: ApprovalRequestStatus;
  createdAt: Date;
  submittedBy?: { id: string; email: string } | null;
}) {
  return {
    id: row.id,
    requestType: row.requestType,
    title: row.title,
    description: row.description,
    amount: row.amount ? Number(row.amount) : null,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    submittedBy: row.submittedBy ?? null,
  };
}
