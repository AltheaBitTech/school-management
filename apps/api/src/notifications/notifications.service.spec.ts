import { NotFoundException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { NOTIFICATION_EVENT_KEYS } from './constants/notification.constants';
import { NotificationsService } from './notifications.service';
import { EmailProvider } from './providers/email-provider.interface';
import { renderLeaveNotificationTemplate } from './utils/notification-template.util';

describe('renderLeaveNotificationTemplate', () => {
  const context = {
    staffName: 'Anita Desai',
    leaveTypeName: 'Casual Leave',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
  };

  it('renders leave.approved template', () => {
    const template = renderLeaveNotificationTemplate(
      NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
      context,
    );

    expect(template.eventKey).toBe('leave.approved');
    expect(template.title).toBe('Leave request approved');
    expect(template.body).toContain('Casual Leave');
    expect(template.html).toContain('Anita Desai');
    expect(template.html).not.toContain('<script');
  });

  it('renders leave.rejected template', () => {
    const template = renderLeaveNotificationTemplate(
      NOTIFICATION_EVENT_KEYS.LEAVE_REJECTED,
      context,
    );

    expect(template.eventKey).toBe('leave.rejected');
    expect(template.title).toBe('Leave request rejected');
    expect(template.body).toContain('rejected');
  });
});

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let prisma: {
    user: { findFirst: jest.Mock };
    notification: {
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let emailProvider: jest.Mocked<EmailProvider>;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      notification: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    emailProvider = {
      sendEmail: jest.fn(),
    };
    notificationsService = new NotificationsService(
      prisma as never,
      emailProvider,
    );
    warnSpy = jest.spyOn(notificationsService['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  const baseInput = {
    organizationId: 'org-a',
    recipientUserId: 'user-a',
    eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
    templateContext: {
      staffName: 'Anita Desai',
      leaveTypeName: 'Casual Leave',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    },
    requestId: 'req-1',
  };

  it('skips delivery when recipient is outside organization', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await notificationsService.recordAndDeliver(baseInput);

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(emailProvider.sendEmail).not.toHaveBeenCalled();
  });

  it('marks notification SENT when provider succeeds', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-a',
      email: 'staff@example.com',
      organizationId: 'org-a',
    });
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    emailProvider.sendEmail.mockResolvedValue(undefined);

    await notificationsService.recordAndDeliver(baseInput);

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-a',
          recipientUserId: 'user-a',
          status: NotificationStatus.PENDING,
          requestId: 'req-1',
        }),
      }),
    );
    expect(emailProvider.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'staff@example.com',
        subject: 'Leave request approved',
      }),
    );
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { status: NotificationStatus.SENT },
    });
  });

  it('marks notification FAILED and does not throw when provider fails', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-a',
      email: 'staff@example.com',
      organizationId: 'org-a',
    });
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    emailProvider.sendEmail.mockRejectedValue(new Error('provider down'));

    await expect(notificationsService.recordAndDeliver(baseInput)).resolves.toBeUndefined();

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { status: NotificationStatus.FAILED },
    });
    expect(warnSpy).toHaveBeenCalled();
    expect(JSON.stringify(warnSpy.mock.calls[0])).not.toContain('staff@example.com');
  });

  it('rejects IDOR when marking another user notification read', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      notificationsService.markRead('org-a', 'user-a', 'notification-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
