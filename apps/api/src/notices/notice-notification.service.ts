import { Injectable } from '@nestjs/common';
import { EmploymentStatus, NoticeAudienceType, StudentStatus } from '@prisma/client';
import { NOTIFICATION_EVENT_KEYS } from '../notifications/constants/notification.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticeNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async notifyPublished(organizationId: string, noticeId: string): Promise<void> {
    const notice = await this.prisma.notice.findFirst({
      where: { id: noticeId, organizationId },
      select: {
        id: true,
        title: true,
        createdByUserId: true,
        audiences: {
          select: { audienceType: true, departmentId: true },
        },
      },
    });

    if (!notice) {
      return;
    }

    const recipientUserIds = await this.resolveAudienceUserIds(organizationId, notice.audiences);
    const templateContext = {
      kind: 'notice' as const,
      noticeTitle: notice.title.trim(),
    };

    for (const recipientUserId of recipientUserIds) {
      if (recipientUserId === notice.createdByUserId) {
        continue;
      }
      await this.notificationsService.recordAndDeliver({
        organizationId,
        recipientUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.NOTICE_PUBLISHED,
        templateContext,
        metadata: { noticeId: notice.id },
      });
    }
  }

  private async resolveAudienceUserIds(
    organizationId: string,
    audiences: Array<{ audienceType: NoticeAudienceType; departmentId: string | null }>,
  ): Promise<string[]> {
    const userIds = new Set<string>();
    let entireSchool = false;

    for (const audience of audiences) {
      if (audience.audienceType === NoticeAudienceType.ENTIRE_ORGANIZATION) {
        entireSchool = true;
      }
    }

    if (entireSchool) {
      const users = await this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true },
      });
      for (const user of users) {
        userIds.add(user.id);
      }
      return [...userIds];
    }

    for (const audience of audiences) {
      if (audience.audienceType === NoticeAudienceType.STAFF) {
        const staff = await this.prisma.staff.findMany({
          where: {
            organizationId,
            employmentStatus: EmploymentStatus.ACTIVE,
            userId: { not: null },
          },
          select: { userId: true },
        });
        for (const row of staff) {
          if (row.userId) {
            userIds.add(row.userId);
          }
        }
      }

      if (audience.audienceType === NoticeAudienceType.STUDENT) {
        const students = await this.prisma.student.findMany({
          where: {
            organizationId,
            status: StudentStatus.ACTIVE,
            userId: { not: null },
          },
          select: { userId: true },
        });
        for (const row of students) {
          if (row.userId) {
            userIds.add(row.userId);
          }
        }
      }

      if (audience.audienceType === NoticeAudienceType.PARENT) {
        const links = await this.prisma.parentStudentLink.findMany({
          where: { organizationId },
          select: { parentUserId: true },
        });
        for (const link of links) {
          userIds.add(link.parentUserId);
        }
      }

      if (
        audience.audienceType === NoticeAudienceType.DEPARTMENT &&
        audience.departmentId
      ) {
        const staff = await this.prisma.staff.findMany({
          where: {
            organizationId,
            departmentId: audience.departmentId,
            employmentStatus: EmploymentStatus.ACTIVE,
            userId: { not: null },
          },
          select: { userId: true },
        });
        for (const row of staff) {
          if (row.userId) {
            userIds.add(row.userId);
          }
        }
      }
    }

    return [...userIds];
  }
}
