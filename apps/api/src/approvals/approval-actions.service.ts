import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalActionType,
  ApprovalLevel,
  ApprovalRequest,
  ApprovalRequestStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalEntityIntegrationService } from './approval-entity-integration.service';
import { ApproverResolutionService } from './approver-resolution.service';
import { APPROVAL_ERROR_CODES } from './constants/approval.constants';
import { ApprovalDecisionDto } from './dto/approval.dto';

type LockedApprovalRequest = ApprovalRequest & {
  workflow: {
    levels: ApprovalLevel[];
  };
};

@Injectable()
export class ApprovalActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approverResolutionService: ApproverResolutionService,
    private readonly entityIntegrationService: ApprovalEntityIntegrationService,
  ) {}

  async approve(
    organizationId: string,
    approvalRequestId: string,
    actor: AuthenticatedUser,
    dto?: ApprovalDecisionDto,
  ): Promise<ApprovalRequest> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.lockPendingApprovalRequest(tx, organizationId, approvalRequestId);

      if (request.submittedById === actor.userId) {
        throw new ForbiddenException({
          code: APPROVAL_ERROR_CODES.APPROVAL_SELF_APPROVAL,
          message: 'You cannot approve your own request',
        });
      }

      const currentLevel = this.getCurrentLevelConfig(request);
      await this.approverResolutionService.assertActorAuthorizedForLevel(
        tx,
        organizationId,
        currentLevel,
        actor.userId,
      );

      await tx.approvalAction.create({
        data: {
          approvalRequestId: request.id,
          level: request.currentLevel,
          action: ApprovalActionType.APPROVED,
          actorUserId: actor.userId,
          comment: dto?.comment?.trim() || null,
        },
      });

      const maxLevel = request.workflow.levels.reduce(
        (max, level) => Math.max(max, level.level),
        0,
      );

      if (request.currentLevel < maxLevel) {
        return tx.approvalRequest.update({
          where: { id: request.id },
          data: {
            currentLevel: request.currentLevel + 1,
          },
        });
      }

      const finalized = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: ApprovalRequestStatus.APPROVED,
          completedAt: new Date(),
        },
      });

      await this.entityIntegrationService.onApproved(tx, organizationId, finalized, actor);

      return finalized;
    });
  }

  async reject(
    organizationId: string,
    approvalRequestId: string,
    actor: AuthenticatedUser,
    dto?: ApprovalDecisionDto,
  ): Promise<ApprovalRequest> {
    return this.prisma.$transaction(async (tx) => {
      const request = await this.lockPendingApprovalRequest(tx, organizationId, approvalRequestId);

      if (request.submittedById === actor.userId) {
        throw new ForbiddenException({
          code: APPROVAL_ERROR_CODES.APPROVAL_SELF_APPROVAL,
          message: 'You cannot reject your own request',
        });
      }

      const currentLevel = this.getCurrentLevelConfig(request);
      await this.approverResolutionService.assertActorAuthorizedForLevel(
        tx,
        organizationId,
        currentLevel,
        actor.userId,
      );

      await tx.approvalAction.create({
        data: {
          approvalRequestId: request.id,
          level: request.currentLevel,
          action: ApprovalActionType.REJECTED,
          actorUserId: actor.userId,
          comment: dto?.comment?.trim() || null,
        },
      });

      const finalized = await tx.approvalRequest.update({
        where: { id: request.id },
        data: {
          status: ApprovalRequestStatus.REJECTED,
          completedAt: new Date(),
        },
      });

      await this.entityIntegrationService.onRejected(tx, organizationId, finalized, actor);

      return finalized;
    });
  }

  private getCurrentLevelConfig(request: LockedApprovalRequest): ApprovalLevel {
    const currentLevel = request.workflow.levels.find((level) => level.level === request.currentLevel);

    if (!currentLevel) {
      throw new NotFoundException({
        code: APPROVAL_ERROR_CODES.APPROVAL_LEVEL_NOT_CONFIGURED,
        message: 'Approval level is not configured',
      });
    }

    return currentLevel;
  }

  private async lockPendingApprovalRequest(
    tx: Prisma.TransactionClient,
    organizationId: string,
    approvalRequestId: string,
  ): Promise<LockedApprovalRequest> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "ApprovalRequest"
      WHERE id = ${approvalRequestId}::uuid
        AND "organizationId" = ${organizationId}::uuid
        AND status = ${ApprovalRequestStatus.PENDING}::"ApprovalRequestStatus"
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      const existing = await tx.approvalRequest.findFirst({
        where: { id: approvalRequestId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException({
          code: APPROVAL_ERROR_CODES.APPROVAL_NOT_FOUND,
          message: 'Approval request not found',
        });
      }

      throw new ConflictException({
        code: APPROVAL_ERROR_CODES.APPROVAL_NOT_PENDING,
        message: 'Approval request is not pending',
      });
    }

    return tx.approvalRequest.findFirstOrThrow({
      where: { id: approvalRequestId, organizationId },
      include: {
        workflow: {
          include: {
            levels: {
              orderBy: { level: 'asc' },
            },
          },
        },
      },
    });
  }
}
