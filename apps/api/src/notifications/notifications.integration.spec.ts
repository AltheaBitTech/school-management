import { NotFoundException } from '@nestjs/common';
import {
  LeaveRequestStatus,
  NotificationStatus,
  PrismaClient,
} from '@prisma/client';
import { ApprovalActionsService } from '../approvals/approval-actions.service';
import { ApprovalEntityIntegrationService } from '../approvals/approval-entity-integration.service';
import { ApprovalNotificationService } from '../approvals/approval-notification.service';
import { ApprovalRequestsService } from '../approvals/approval-requests.service';
import { ApproverResolutionService } from '../approvals/approver-resolution.service';
import { ensureDefaultLeaveApprovalWorkflow } from '../approvals/utils/approval-workflow-seed.util';
import { LeaveApprovalIntegrationService } from '../leave/leave-approval-integration.service';
import { LeaveBalancesService } from '../leave/leave-balances.service';
import { LeaveRequestsService } from '../leave/leave-requests.service';
import { LeaveTypesService } from '../leave/leave-types.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_EVENT_KEYS } from './constants/notification.constants';
import { EmailProvider } from './providers/email-provider.interface';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Notifications integration', () => {
  let prisma: PrismaClient;
  let notificationsService: NotificationsService;
  let approvalActionsService: ApprovalActionsService;
  let leaveRequestsService: LeaveRequestsService;
  let emailProvider: jest.Mocked<EmailProvider>;
  let orgAId: string;
  let orgBId: string;
  let requesterUserId: string;
  let otherUserAId: string;
  let approverUserId: string;
  let userBId: string;
  let leaveTypeAId: string;
  let staffAId: string;

  const requesterActor = () => ({
    userId: requesterUserId,
    organizationId: orgAId,
    sessionId: 'notification-requester-session',
    email: 'requester@example.com',
  });

  const approverActor = () => ({
    userId: approverUserId,
    organizationId: orgAId,
    sessionId: 'notification-approver-session',
    email: 'approver@example.com',
  });

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    const orgA = await prisma.organization.create({
      data: { name: 'Notification School A', code: `notification-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Notification School B', code: `notification-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const requesterUser = await prisma.user.create({
      data: { organizationId: orgAId, email: `notification-requester-${Date.now()}@example.com` },
    });
    requesterUserId = requesterUser.id;

    const otherUserA = await prisma.user.create({
      data: { organizationId: orgAId, email: `notification-other-a-${Date.now()}@example.com` },
    });
    otherUserAId = otherUserA.id;

    const approverUser = await prisma.user.create({
      data: { organizationId: orgAId, email: `notification-approver-${Date.now()}@example.com` },
    });
    approverUserId = approverUser.id;

    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `notification-user-b-${Date.now()}@example.com` },
    });
    userBId = userB.id;

    await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'notification-staff-a',
        firstName: 'Notify',
        lastName: 'Staff',
        userId: requesterUserId,
      },
    });
    staffAId = (
      await prisma.staff.findFirstOrThrow({
        where: { organizationId: orgAId, userId: requesterUserId },
      })
    ).id;

    await ensureSchoolAdminRole(prisma, orgAId);
    await ensureDefaultLeaveApprovalWorkflow(prisma, orgAId);
    const schoolAdminRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: orgAId, code: 'SCHOOL_ADMIN' },
    });
    await prisma.userRole.create({
      data: { userId: approverUserId, roleId: schoolAdminRole.id },
    });

    emailProvider = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    notificationsService = new NotificationsService(
      prisma as unknown as PrismaService,
      emailProvider,
    );

    const leaveTypesService = new LeaveTypesService(prisma as unknown as PrismaService);
    const leaveApprovalIntegration = new LeaveApprovalIntegrationService();
    const approvalEntityIntegration = new ApprovalEntityIntegrationService(leaveApprovalIntegration);
    const approverResolutionService = new ApproverResolutionService();
    const approvalRequestsService = new ApprovalRequestsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
    );
    const approvalNotificationService = new ApprovalNotificationService(
      prisma as unknown as PrismaService,
      notificationsService,
    );
    approvalActionsService = new ApprovalActionsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
      approvalEntityIntegration,
      approvalNotificationService,
    );
    leaveRequestsService = new LeaveRequestsService(
      prisma as unknown as PrismaService,
      leaveTypesService,
      approvalRequestsService,
      approvalActionsService,
    );

    const leaveTypeA = await leaveTypesService.create(orgAId, {
      name: 'Casual Leave',
      code: 'casual',
      tracksBalance: true,
      requiresReason: true,
    });
    leaveTypeAId = leaveTypeA.id;

    const leaveBalancesService = new LeaveBalancesService(
      prisma as unknown as PrismaService,
      leaveTypesService,
    );
    await leaveBalancesService.create(orgAId, {
      staffId: staffAId,
      leaveTypeId: leaveTypeAId,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      allocatedAmount: 10,
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.approvalAction.deleteMany({
      where: { approvalRequest: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.approvalLevel.deleteMany({
      where: { workflow: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalWorkflow.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveBalance.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveType.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.userRole.deleteMany({
      where: { user: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.rolePermission.deleteMany({
      where: { role: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.role.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates a leave approved notification for the requester after approval commits', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      requesterActor(),
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-09-10',
        endDate: '2026-09-11',
        reason: 'Personal',
      },
      true,
    );

    await leaveRequestsService.approve(orgAId, leaveRequest.id, approverActor(), {
      requestId: 'leave-approve-req-1',
    });

    const notifications = await prisma.notification.findMany({
      where: { organizationId: orgAId, recipientUserId: requesterUserId },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.eventKey).toBe(NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED);
    expect(notifications[0]?.status).toBe(NotificationStatus.SENT);
    expect(notifications[0]?.requestId).toBe('leave-approve-req-1');

    const updatedLeave = await prisma.leaveRequest.findFirstOrThrow({
      where: { id: leaveRequest.id },
    });
    expect(updatedLeave.status).toBe(LeaveRequestStatus.APPROVED);
  });

  it('creates a leave rejected notification for the requester after rejection commits', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      requesterActor(),
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-09-12',
        endDate: '2026-09-13',
        reason: 'Personal',
      },
      true,
    );

    await leaveRequestsService.reject(orgAId, leaveRequest.id, approverActor());

    const notification = await prisma.notification.findFirst({
      where: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_REJECTED,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).toBeTruthy();
    expect(notification?.status).toBe(NotificationStatus.SENT);
  });

  it('keeps leave approved when email provider fails and marks notification FAILED', async () => {
    emailProvider.sendEmail.mockRejectedValueOnce(new Error('provider down'));

    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      requesterActor(),
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-09-14',
        endDate: '2026-09-15',
        reason: 'Personal',
      },
      true,
    );

    await leaveRequestsService.approve(orgAId, leaveRequest.id, approverActor());

    const notification = await prisma.notification.findFirst({
      where: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification?.status).toBe(NotificationStatus.FAILED);

    const updatedLeave = await prisma.leaveRequest.findFirstOrThrow({
      where: { id: leaveRequest.id },
    });
    expect(updatedLeave.status).toBe(LeaveRequestStatus.APPROVED);
  });

  it('lists only the authenticated user notifications', async () => {
    await prisma.notification.create({
      data: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
        title: 'Mine',
        body: 'Mine',
        status: NotificationStatus.SENT,
      },
    });
    await prisma.notification.create({
      data: {
        organizationId: orgAId,
        recipientUserId: otherUserAId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
        title: 'Other',
        body: 'Other',
        status: NotificationStatus.SENT,
      },
    });

    const result = await notificationsService.list(orgAId, requesterUserId, {
      page: 1,
      pageSize: 25,
    });

    expect(result.data.every((row) => row.title !== 'Other')).toBe(true);
    expect(result.data.some((row) => row.title === 'Mine')).toBe(true);
  });

  it('prevents tenant B user from reading tenant A notification via markRead', async () => {
    const notification = await prisma.notification.create({
      data: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
        title: 'Tenant A',
        body: 'Tenant A',
        status: NotificationStatus.SENT,
      },
    });

    await expect(
      notificationsService.markRead(orgBId, userBId, notification.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents IDOR when another user in same tenant marks notification read', async () => {
    const notification = await prisma.notification.create({
      data: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
        title: 'Private',
        body: 'Private',
        status: NotificationStatus.SENT,
      },
    });

    await expect(
      notificationsService.markRead(orgAId, otherUserAId, notification.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows self markRead through controller guard path', async () => {
    const notification = await prisma.notification.create({
      data: {
        organizationId: orgAId,
        recipientUserId: requesterUserId,
        eventKey: NOTIFICATION_EVENT_KEYS.LEAVE_APPROVED,
        title: 'Read me',
        body: 'Read me',
        status: NotificationStatus.SENT,
      },
    });

    const controller = new NotificationsController(notificationsService);
    const result = await controller.markRead(
      {
        userId: requesterUserId,
        organizationId: orgAId,
        sessionId: 'notification-requester-session',
        email: 'requester@example.com',
      },
      notification.id,
    );

    expect(result.data.readAt).toBeTruthy();
  });
});
