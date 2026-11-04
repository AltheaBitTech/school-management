import { Injectable } from '@nestjs/common';
import {
  ApprovalEntityType,
  ApprovalRequest,
  ApprovalRequestStatus,
  Prisma,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { LeaveApprovalIntegrationService } from '../leave/leave-approval-integration.service';

@Injectable()
export class ApprovalEntityIntegrationService {
  constructor(private readonly leaveApprovalIntegration: LeaveApprovalIntegrationService) {}

  async onApproved(
    tx: Prisma.TransactionClient,
    organizationId: string,
    request: ApprovalRequest,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (request.entityType === ApprovalEntityType.LEAVE) {
      await this.leaveApprovalIntegration.finalizeApproval(
        tx,
        organizationId,
        request.entityId,
        actor,
      );
    }
    if (isOperationalEntity(request.entityType)) {
      await tx.operationalRequest.updateMany({
        where: { id: request.entityId, organizationId },
        data: { status: ApprovalRequestStatus.APPROVED },
      });
    }
  }

  async onRejected(
    tx: Prisma.TransactionClient,
    organizationId: string,
    request: ApprovalRequest,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (request.entityType === ApprovalEntityType.LEAVE) {
      await this.leaveApprovalIntegration.finalizeRejection(
        tx,
        organizationId,
        request.entityId,
        actor,
      );
    }
    if (isOperationalEntity(request.entityType)) {
      await tx.operationalRequest.updateMany({
        where: { id: request.entityId, organizationId },
        data: { status: ApprovalRequestStatus.REJECTED },
      });
    }
  }

  async assertEntityExists(
    tx: Prisma.TransactionClient,
    organizationId: string,
    entityType: ApprovalEntityType,
    entityId: string,
  ): Promise<void> {
    if (entityType === ApprovalEntityType.LEAVE) {
      await this.leaveApprovalIntegration.assertLeaveEntityExists(tx, organizationId, entityId);
    }
    if (isOperationalEntity(entityType)) {
      const row = await tx.operationalRequest.findFirst({
        where: { id: entityId, organizationId, requestType: entityType },
      });
      if (!row) {
        throw new Error('Operational request not found');
      }
    }
  }
}

function isOperationalEntity(entityType: ApprovalEntityType): boolean {
  return (
    entityType === ApprovalEntityType.MAINTENANCE ||
    entityType === ApprovalEntityType.PURCHASE ||
    entityType === ApprovalEntityType.BUDGET
  );
}
