import { Injectable } from '@nestjs/common';
import {
  ApprovalEntityType,
  ApprovalRequest,
  ApprovalRequestStatus,
} from '@prisma/client';
import { formatLeaveDate } from '../leave/utils/leave.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICATION_EVENT_KEYS,
  NotificationEventKey,
} from '../notifications/constants/notification.constants';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApprovalNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyLeaveOutcomeIfFinalized(
    organizationId: string,
    approvalRequest: ApprovalRequest,
    requestId?: string,
  ): Promise<void> {
    if (approvalRequest.entityType !== ApprovalEntityType.LEAVE) {
      return;
    }

    if (
      approvalRequest.status !== ApprovalRequestStatus.APPROVED &&
      approvalRequest.status !== ApprovalRequestStatus.REJECTED
    ) {
      return;
    }

    const eventKey: NotificationEventKey =
      approvalRequest.status === ApprovalRequestStatus.APPROVED
        ? NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED
        : NOTIFICATION_EVENT_KEYS.LEAVE_REJECTED;

    const leaveRequest = await this.prisma.leaveRequest.findFirst({
      where: {
        id: approvalRequest.entityId,
        organizationId,
      },
      include: {
        staff: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
        leaveType: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!leaveRequest?.staff.userId) {
      return;
    }

    const staffName =
      leaveRequest.staff.displayName?.trim() ||
      `${leaveRequest.staff.firstName} ${leaveRequest.staff.lastName}`.trim();

    await this.notificationsService.recordAndDeliver({
      organizationId,
      recipientUserId: leaveRequest.staff.userId,
      eventKey,
      requestId,
      templateContext: {
        staffName,
        leaveTypeName: leaveRequest.leaveType.name,
        startDate: formatLeaveDate(leaveRequest.startDate),
        endDate: formatLeaveDate(leaveRequest.endDate),
      },
      metadata: {
        leaveRequestId: leaveRequest.id,
        approvalRequestId: approvalRequest.id,
      },
    });
  }
}
