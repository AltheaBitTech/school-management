import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, NotificationStatus, Prisma } from '@prisma/client';
import { Inject } from '@nestjs/common';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_ERROR_CODES } from './constants/notification.constants';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { RecordAndDeliverInput } from './dto/record-and-deliver.dto';
import { NotificationRowDto } from './dto/notification-response.dto';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from './providers/email-provider.interface';
import { renderNotificationTemplate } from './utils/notification-template.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
  ) {}

  async recordAndDeliver(input: RecordAndDeliverInput): Promise<void> {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: input.recipientUserId,
        organizationId: input.organizationId,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    });

    if (!recipient) {
      this.logger.warn(
        JSON.stringify({
          action: 'notification.skipped',
          reason: NOTIFICATION_ERROR_CODES.INVALID_RECIPIENT,
          organizationId: input.organizationId,
          recipientUserId: input.recipientUserId,
          eventKey: input.eventKey,
          requestId: input.requestId,
        }),
      );
      return;
    }

    const template = renderNotificationTemplate(input.eventKey, input.templateContext);

    const notification = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        recipientUserId: recipient.id,
        eventKey: template.eventKey,
        title: template.title,
        body: template.body,
        status: NotificationStatus.PENDING,
        requestId: input.requestId ?? null,
        ...(input.metadata
          ? { metadata: input.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });

    try {
      await this.emailProvider.sendEmail({
        to: recipient.email,
        subject: template.emailSubject,
        text: template.body,
        html: template.html,
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT },
      });
    } catch (error) {
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      });

      this.logger.warn(
        JSON.stringify({
          action: 'notification.email.failed',
          notificationId: notification.id,
          organizationId: input.organizationId,
          recipientUserId: recipient.id,
          eventKey: input.eventKey,
          requestId: input.requestId,
          error: error instanceof Error ? error.message : 'unknown_error',
        }),
      );
    }
  }

  async list(
    organizationId: string,
    recipientUserId: string,
    query: ListNotificationsQueryDto,
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientUserId,
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((notification) => this.toDto(notification)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async markRead(
    organizationId: string,
    recipientUserId: string,
    notificationId: string,
  ): Promise<NotificationRowDto> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        organizationId,
        recipientUserId,
      },
    });

    if (!notification) {
      throw new NotFoundException({
        code: NOTIFICATION_ERROR_CODES.NOTIFICATION_NOT_FOUND,
        message: 'Notification not found',
      });
    }

    if (notification.readAt) {
      return this.toDto(notification);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });

    return this.toDto(updated);
  }

  private toDto(notification: Notification): NotificationRowDto {
    return {
      id: notification.id,
      channel: notification.channel,
      eventKey: notification.eventKey as RecordAndDeliverInput['eventKey'],
      title: notification.title,
      body: notification.body,
      status: notification.status,
      readAt: notification.readAt?.toISOString() ?? null,
      metadata: (notification.metadata as Record<string, unknown> | null) ?? null,
      requestId: notification.requestId,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
