import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeaveRequestStatus, PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { ApprovalActionsService } from '../approvals/approval-actions.service';
import { ApprovalEntityIntegrationService } from '../approvals/approval-entity-integration.service';
import { ApprovalNotificationService } from '../approvals/approval-notification.service';
import { ApprovalRequestsService } from '../approvals/approval-requests.service';
import { ApproverResolutionService } from '../approvals/approver-resolution.service';
import { ensureDefaultLeaveApprovalWorkflow } from '../approvals/utils/approval-workflow-seed.util';
import { AttendanceService } from '../attendance/attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensureStaffRole, ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { LeaveApprovalIntegrationService } from '../leave/leave-approval-integration.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailProvider } from '../notifications/providers/email-provider.interface';
import { LeaveBalancesService } from '../leave/leave-balances.service';
import { LeaveRequestsService } from '../leave/leave-requests.service';
import { LeaveTypesService } from '../leave/leave-types.service';
import { StaffContextService } from './staff-context.service';
import { StaffSelfService } from './staff-self.service';
import { FeatureFlagsService } from '../common/features/feature-flags.service';
import { ConfigService } from '@nestjs/config';
import { FEATURES_CONFIG_KEY, FeaturesConfig } from '../config/features.configuration';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { getLocalDateString } from '../dashboard/utils/dashboard-date.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Staff self-service integration', () => {
  jest.setTimeout(120_000);
  let prisma: PrismaClient;
  let staffSelfService: StaffSelfService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let staffUserAId: string;
  let staffUserBId: string;
  let staffAId: string;
  let staffBId: string;
  let staffRoleAId: string;
  let leaveTypeAId: string;

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

    const suffix = Date.now();
    const orgA = await prisma.organization.create({
      data: { name: 'Staff Self A', code: `staff-self-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Staff Self B', code: `staff-self-b-${suffix}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.createMany({
      data: [
        { organizationId: orgAId, timezone: 'UTC' },
        { organizationId: orgBId, timezone: 'UTC' },
      ],
    });

    const staffRole = await ensureStaffRole(prisma, orgAId);
    staffRoleAId = staffRole.id;
    await ensureStaffRole(prisma, orgBId);
    await ensureSchoolAdminRole(prisma, orgAId);
    await ensureDefaultLeaveApprovalWorkflow(prisma, orgAId);

    const staffUserA = await prisma.user.create({
      data: { organizationId: orgAId, email: `staff-a-${suffix}@example.com` },
    });
    const staffUserB = await prisma.user.create({
      data: { organizationId: orgAId, email: `staff-b-${suffix}@example.com` },
    });
    staffUserAId = staffUserA.id;
    staffUserBId = staffUserB.id;

    await prisma.userRole.createMany({
      data: [
        { userId: staffUserAId, roleId: staffRoleAId },
        { userId: staffUserBId, roleId: staffRoleAId },
      ],
    });

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `ssa-${suffix}`,
        firstName: 'Staff',
        lastName: 'A',
        userId: staffUserAId,
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `ssb-${suffix}`,
        firstName: 'Staff',
        lastName: 'B',
        userId: staffUserBId,
      },
    });
    staffAId = staffA.id;
    staffBId = staffB.id;

    const leaveTypesService = new LeaveTypesService(prisma as unknown as PrismaService);
    const leaveType = await leaveTypesService.create(orgAId, {
      name: 'Casual',
      code: 'casual',
      tracksBalance: true,
      requiresReason: true,
    });
    leaveTypeAId = leaveType.id;

    const leaveBalancesService = new LeaveBalancesService(
      prisma as unknown as PrismaService,
      leaveTypesService,
    );
    for (const staffId of [staffAId, staffBId]) {
      await leaveBalancesService.create(orgAId, {
        staffId,
        leaveTypeId: leaveTypeAId,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        allocatedAmount: 12,
      });
    }

    const attendanceService = new AttendanceService(prisma as unknown as PrismaService, {
      get: () => ({ accessSecret: 'test-secret-with-enough-length' }),
    } as never);
    const staffContextService = new StaffContextService(prisma as unknown as PrismaService);
    const leaveApprovalIntegration = new LeaveApprovalIntegrationService();
    const approvalEntityIntegration = new ApprovalEntityIntegrationService(leaveApprovalIntegration);
    const approverResolutionService = new ApproverResolutionService();
    const approvalRequestsService = new ApprovalRequestsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
    );
    const emailProvider: EmailProvider = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = new NotificationsService(
      prisma as unknown as PrismaService,
      emailProvider,
    );
    const approvalNotificationService = new ApprovalNotificationService(
      prisma as unknown as PrismaService,
      notificationsService,
    );
    const approvalActionsService = new ApprovalActionsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
      approvalEntityIntegration,
      approvalNotificationService,
    );
    const leaveRequestsService = new LeaveRequestsService(
      prisma as unknown as PrismaService,
      leaveTypesService,
      approvalRequestsService,
      approvalActionsService,
    );

    const featureFlagsService = new FeatureFlagsService({
      get: (key: string) =>
        key === FEATURES_CONFIG_KEY
          ? ({ attendanceEnabled: true } satisfies FeaturesConfig)
          : undefined,
    } as ConfigService);

    staffSelfService = new StaffSelfService(
      prisma as unknown as PrismaService,
      staffContextService,
      attendanceService,
      leaveBalancesService,
      leaveRequestsService,
      leaveTypesService,
      approvalRequestsService,
      featureFlagsService,
    );

    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const localDate = getLocalDateString('UTC');
    await prisma.staffAttendance.create({
      data: {
        organizationId: orgAId,
        staffId: staffAId,
        attendanceDate: parseAttendanceDate(localDate),
        status: 'PRESENT',
      },
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.approvalAction.deleteMany({
      where: { approvalRequest: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.approvalLevel.deleteMany({
      where: { workflow: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalWorkflow.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staffAttendance.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveBalance.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveType.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.userRole.deleteMany({ where: { user: { organizationId: { in: [orgAId, orgBId] } } } });
    await prisma.rolePermission.deleteMany({
      where: { role: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.role.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  function actor(userId: string, organizationId = orgAId) {
    return {
      userId,
      organizationId,
      email: 'actor@example.com',
      sessionId: 'test-session',
    };
  }

  async function assertGuardAllows(permission: string, userId: string): Promise<void> {
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([permission]);
    const request = { user: actor(userId) };
    const canActivate = await permissionsGuard.canActivate({
      ...context,
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);
    expect(canActivate).toBe(true);
  }

  it('enforces staff.self permissions for staff user', async () => {
    await assertGuardAllows('staff.self.view', staffUserAId);
    await assertGuardAllows('staff.self.attendance.view', staffUserAId);
    await assertGuardAllows('staff.self.leave.create', staffUserAId);
  });

  it('returns dashboard data scoped to authenticated staff', async () => {
    const dashboard = await staffSelfService.getDashboard(actor(staffUserAId));
    expect(dashboard.staff.id).toBe(staffAId);
    expect(dashboard.todayAttendance?.status).toBe('PRESENT');
    expect(dashboard.leaveBalances.length).toBeGreaterThan(0);
  });

  it('submits leave as pending approval for own staff profile', async () => {
    const created = await staffSelfService.createLeaveRequest(actor(staffUserAId), {
      leaveTypeId: leaveTypeAId,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      reason: 'Personal',
    });

    expect(created.status).toBe(LeaveRequestStatus.PENDING_APPROVAL);
    expect(created.staffId).toBe(staffAId);
  });

  it('rejects IDOR when staff A requests staff B leave detail', async () => {
    const created = await staffSelfService.createLeaveRequest(actor(staffUserBId), {
      leaveTypeId: leaveTypeAId,
      startDate: '2026-11-20',
      endDate: '2026-11-21',
      reason: 'Other staff',
    });

    await expect(
      staffSelfService.getLeaveRequest(actor(staffUserAId), created.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects cross-tenant leave lookup', async () => {
    await expect(
      staffSelfService.getLeaveRequest(
        actor(staffUserAId, orgBId),
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes attendance listing to own staff id only', async () => {
    const result = await staffSelfService.listAttendance(actor(staffUserAId), {
      page: 1,
      pageSize: 20,
    });
    expect(result.data.every((row) => row.staffId === staffAId)).toBe(true);
  });
});
