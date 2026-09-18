import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  ApprovalApproverType,
  ApprovalLevel,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { APPROVAL_ERROR_CODES } from './constants/approval.constants';

@Injectable()
export class ApproverResolutionService {
  async assertActorAuthorizedForLevel(
    tx: Prisma.TransactionClient,
    organizationId: string,
    level: ApprovalLevel,
    actorUserId: string,
  ): Promise<void> {
    const actor = await tx.user.findFirst({
      where: { id: actorUserId, organizationId, status: UserStatus.ACTIVE },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!actor) {
      throw new ForbiddenException({
        code: APPROVAL_ERROR_CODES.APPROVAL_NOT_AUTHORIZED,
        message: 'You are not authorized to act on this approval request',
      });
    }

    if (level.approverType === ApprovalApproverType.USER) {
      if (level.userId !== actorUserId) {
        throw new ForbiddenException({
          code: APPROVAL_ERROR_CODES.APPROVAL_NOT_AUTHORIZED,
          message: 'You are not authorized to act on this approval request',
        });
      }
      return;
    }

    if (level.approverType === ApprovalApproverType.ROLE) {
      if (!level.roleId) {
        throw new ForbiddenException({
          code: APPROVAL_ERROR_CODES.APPROVAL_LEVEL_NOT_CONFIGURED,
          message: 'Approval level is not configured correctly',
        });
      }

      const hasRole = actor.userRoles.some(
        (assignment) =>
          assignment.role.organizationId === organizationId &&
          assignment.role.id === level.roleId,
      );

      if (!hasRole) {
        throw new ForbiddenException({
          code: APPROVAL_ERROR_CODES.APPROVAL_NOT_AUTHORIZED,
          message: 'You are not authorized to act on this approval request',
        });
      }
      return;
    }

    throw new ForbiddenException({
      code: APPROVAL_ERROR_CODES.APPROVAL_LEVEL_NOT_CONFIGURED,
      message: 'Approval level is not configured correctly',
    });
  }

  async resolveLevelApproverSummary(
    tx: Prisma.TransactionClient,
    organizationId: string,
    level: ApprovalLevel,
  ): Promise<{ type: ApprovalApproverType; roleName?: string; userEmail?: string }> {
    if (level.approverType === ApprovalApproverType.ROLE && level.roleId) {
      const role = await tx.role.findFirst({
        where: { id: level.roleId, organizationId },
      });
      return {
        type: level.approverType,
        roleName: role?.name ?? undefined,
      };
    }

    if (level.approverType === ApprovalApproverType.USER && level.userId) {
      const user = await tx.user.findFirst({
        where: { id: level.userId, organizationId },
      });
      return {
        type: level.approverType,
        userEmail: user?.email ?? undefined,
      };
    }

    return { type: level.approverType };
  }
}
