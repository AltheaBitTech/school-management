import { Injectable } from '@nestjs/common';
import { ComplaintStatus } from '@prisma/client';
import { NOTIFICATION_EVENT_KEYS } from '../notifications/constants/notification.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ComplaintNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyAssigned(organizationId: string, complaintId: string): Promise<void> {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, organizationId },
      select: {
        id: true,
        complaintCode: true,
        title: true,
        assignedToStaff: {
          select: { userId: true },
        },
      },
    });

    const recipientUserId = complaint?.assignedToStaff?.userId;
    if (!complaint || !recipientUserId) {
      return;
    }

    await this.notificationsService.recordAndDeliver({
      organizationId,
      recipientUserId,
      eventKey: NOTIFICATION_EVENT_KEYS.COMPLAINT_ASSIGNED,
      templateContext: {
        kind: 'complaint',
        complaintCode: complaint.complaintCode,
        title: complaint.title.trim(),
        status: ComplaintStatus.ASSIGNED,
      },
      metadata: { complaintId: complaint.id },
    });
  }

  async notifyStatusChanged(
    organizationId: string,
    complaintId: string,
    status: ComplaintStatus,
  ): Promise<void> {
    const complaint = await this.prisma.complaint.findFirst({
      where: { id: complaintId, organizationId },
      select: {
        id: true,
        complaintCode: true,
        title: true,
        status: true,
        createdByUserId: true,
        assignedToStaff: { select: { userId: true } },
      },
    });

    if (!complaint) {
      return;
    }

    const templateContext = {
      kind: 'complaint' as const,
      complaintCode: complaint.complaintCode,
      title: complaint.title.trim(),
      status,
    };

    const recipientIds = new Set<string>();
    if (complaint.createdByUserId) {
      recipientIds.add(complaint.createdByUserId);
    }
    if (complaint.assignedToStaff?.userId) {
      recipientIds.add(complaint.assignedToStaff.userId);
    }

    for (const recipientUserId of recipientIds) {
      await this.notificationsService.recordAndDeliver({
        organizationId,
        recipientUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.COMPLAINT_STATUS_CHANGED,
        templateContext,
        metadata: { complaintId: complaint.id, status },
      });
    }
  }
}
