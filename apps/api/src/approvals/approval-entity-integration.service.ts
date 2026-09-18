import { Injectable } from '@nestjs/common';
import {
  ApprovalEntityType,
  ApprovalRequest,
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
  }
}
