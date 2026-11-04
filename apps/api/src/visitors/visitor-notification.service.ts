import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_EVENT_KEYS } from '../notifications/constants/notification.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { formatDocumentDateTime } from '../documents/utils/document-format.util';

@Injectable()
export class VisitorNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyHostOnCheckIn(
    organizationId: string,
    visitorId: string,
    requestId?: string,
  ): Promise<void> {
    const visitor = await this.prisma.visitor.findFirst({
      where: { id: visitorId, organizationId },
      include: {
        hostStaff: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });

    if (!visitor?.hostStaff.userId) {
      return;
    }

    const hostName =
      visitor.hostStaff.displayName?.trim() ||
      `${visitor.hostStaff.firstName} ${visitor.hostStaff.lastName}`.trim();

    await this.notificationsService.recordAndDeliver({
      organizationId,
      recipientUserId: visitor.hostStaff.userId,
      eventKey: NOTIFICATION_EVENT_KEYS.VISITOR_CHECKED_IN,
      templateContext: {
        kind: 'visitor',
        hostName,
        visitorName: visitor.name.trim(),
        visitorCode: visitor.visitorCode,
        purpose: visitor.purpose.trim(),
        checkInAt: formatDocumentDateTime(visitor.checkInAt),
      },
      requestId,
      metadata: { visitorId: visitor.id },
    });
  }
}
