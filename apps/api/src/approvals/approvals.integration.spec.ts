import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalApproverType,
  ApprovalEntityType,
  ApprovalRequestStatus,
  PrismaClient,
} from '@prisma/client';
import { ApprovalActionsService } from './approval-actions.service';
import { ApprovalEntityIntegrationService } from './approval-entity-integration.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import { ApproverResolutionService } from './approver-resolution.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { ensureSchoolAdminRole } from '../roles/organization-role-seed.util';
import { LeaveApprovalIntegrationService } from '../leave/leave-approval-integration.service';
import { LeaveBalancesService } from '../leave/leave-balances.service';
import { LeaveRequestsService } from '../leave/leave-requests.service';
import { LeaveTypesService } from '../leave/leave-types.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Approvals integration', () => {
  let prisma: PrismaClient;
  let approvalWorkflowsService: ApprovalWorkflowsService;
  let approvalRequestsService: ApprovalRequestsService;
  let approvalActionsService: ApprovalActionsService;
  let leaveRequestsService: LeaveRequestsService;
  let leaveBalancesService: LeaveBalancesService;
  let leaveTypesService: LeaveTypesService;
  let orgAId: string;
  let orgBId: string;
  let submitterUserId: string;
  let levelOneApproverId: string;
  let levelTwoApproverId: string;
  let staffId: string;
  let leaveTypeId: string;

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
      data: { name: 'Approval School A', code: `approval-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Approval School B', code: `approval-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    submitterUserId = (
      await prisma.user.create({
        data: { organizationId: orgAId, email: `approval-submitter-${Date.now()}@example.com` },
      })
    ).id;
    levelOneApproverId = (
      await prisma.user.create({
        data: { organizationId: orgAId, email: `approval-level1-${Date.now()}@example.com` },
      })
    ).id;
    levelTwoApproverId = (
      await prisma.user.create({
        data: { organizationId: orgAId, email: `approval-level2-${Date.now()}@example.com` },
      })
    ).id;

    staffId = (
      await prisma.staff.create({
        data: {
          organizationId: orgAId,
          employeeCode: `approval-staff-${Date.now()}`,
          firstName: 'Approval',
          lastName: 'Staff',
          userId: submitterUserId,
        },
      })
    ).id;

    await ensureSchoolAdminRole(prisma, orgAId);
    const schoolAdminRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: orgAId, code: 'SCHOOL_ADMIN' },
    });

    await prisma.userRole.createMany({
      data: [
        { userId: levelOneApproverId, roleId: schoolAdminRole.id },
        { userId: levelTwoApproverId, roleId: schoolAdminRole.id },
      ],
    });

    leaveTypesService = new LeaveTypesService(prisma as unknown as PrismaService);
    leaveBalancesService = new LeaveBalancesService(
      prisma as unknown as PrismaService,
      leaveTypesService,
    );
    const leaveApprovalIntegration = new LeaveApprovalIntegrationService();
    const approvalEntityIntegration = new ApprovalEntityIntegrationService(leaveApprovalIntegration);
    const approverResolutionService = new ApproverResolutionService();
    approvalRequestsService = new ApprovalRequestsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
    );
    approvalActionsService = new ApprovalActionsService(
      prisma as unknown as PrismaService,
      approverResolutionService,
      approvalEntityIntegration,
    );
    approvalWorkflowsService = new ApprovalWorkflowsService(prisma as unknown as PrismaService);
    leaveRequestsService = new LeaveRequestsService(
      prisma as unknown as PrismaService,
      leaveTypesService,
      approvalRequestsService,
      approvalActionsService,
    );

    const leaveType = await leaveTypesService.create(orgAId, {
      name: 'Approval Leave',
      code: `approval-leave-${Date.now()}`,
      tracksBalance: true,
      requiresReason: true,
    });
    leaveTypeId = leaveType.id;

    await leaveBalancesService.create(orgAId, {
      staffId,
      leaveTypeId,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      allocatedAmount: 5,
    });

    await approvalWorkflowsService.create(orgAId, {
      code: 'LEAVE_APPROVAL',
      name: 'Two Level Leave Approval',
      entityType: ApprovalEntityType.LEAVE,
      levels: [
        {
          level: 1,
          name: 'Level 1 Approver',
          approverType: ApprovalApproverType.USER,
          userId: levelOneApproverId,
        },
        {
          level: 2,
          name: 'Level 2 Approver',
          approverType: ApprovalApproverType.USER,
          userId: levelTwoApproverId,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.approvalAction.deleteMany({
      where: { approvalRequest: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.approvalLevel.deleteMany({
      where: { workflow: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.approvalWorkflow.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
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
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('progresses through multi-level approval and consumes leave balance only once', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'submitter@example.com',
      },
      {
        staffId,
        leaveTypeId,
        startDate: '2026-02-01',
        endDate: '2026-02-01',
        reason: 'Multi-level approval',
      },
      false,
    );

    expect(leaveRequest.approvalRequestId).toBeTruthy();

    const afterLevelOne = await approvalActionsService.approve(
      orgAId,
      leaveRequest.approvalRequestId!,
      {
        userId: levelOneApproverId,
        organizationId: orgAId,
        sessionId: 'session-2',
        email: 'level1@example.com',
      },
    );

    expect(afterLevelOne.status).toBe(ApprovalRequestStatus.PENDING);
    expect(afterLevelOne.currentLevel).toBe(2);

    const pendingLeave = await leaveRequestsService.findById(orgAId, leaveRequest.id);
    expect(pendingLeave.status).toBe('PENDING_APPROVAL');

    const balancesBeforeFinal = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId,
      leaveTypeId,
    });
    expect(balancesBeforeFinal.data[0]?.usedAmount).toBe(0);

    await approvalActionsService.approve(orgAId, leaveRequest.approvalRequestId!, {
      userId: levelTwoApproverId,
      organizationId: orgAId,
      sessionId: 'session-3',
      email: 'level2@example.com',
    });

    const approvedLeave = await leaveRequestsService.findById(orgAId, leaveRequest.id);
    expect(approvedLeave.status).toBe('APPROVED');

    const balancesAfterFinal = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId,
      leaveTypeId,
    });
    expect(balancesAfterFinal.data[0]?.usedAmount).toBe(1);
  });

  it('rejects self approval and unauthorized approvers', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-self',
        email: 'submitter@example.com',
      },
      {
        staffId,
        leaveTypeId,
        startDate: '2026-03-01',
        endDate: '2026-03-01',
        reason: 'Self approval test',
      },
      false,
    );

    await expect(
      approvalActionsService.approve(orgAId, leaveRequest.approvalRequestId!, {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-self',
        email: 'submitter@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const outsider = await prisma.user.create({
      data: { organizationId: orgAId, email: `approval-outsider-${Date.now()}@example.com` },
    });

    await expect(
      approvalActionsService.approve(orgAId, leaveRequest.approvalRequestId!, {
        userId: outsider.id,
        organizationId: orgAId,
        sessionId: 'session-outsider',
        email: 'outsider@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects without consuming leave balance', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-reject',
        email: 'submitter@example.com',
      },
      {
        staffId,
        leaveTypeId,
        startDate: '2026-04-01',
        endDate: '2026-04-01',
        reason: 'Reject me',
      },
      false,
    );

    const balancesBefore = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId,
      leaveTypeId,
    });

    await approvalActionsService.reject(orgAId, leaveRequest.approvalRequestId!, {
      userId: levelOneApproverId,
      organizationId: orgAId,
      sessionId: 'session-reject',
      email: 'level1@example.com',
    });

    const rejectedLeave = await leaveRequestsService.findById(orgAId, leaveRequest.id);
    expect(rejectedLeave.status).toBe('REJECTED');

    const balances = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId,
      leaveTypeId,
    });
    expect(balances.data[0]?.usedAmount).toBe(balancesBefore.data[0]?.usedAmount);
  });

  it('blocks cross-tenant approval access', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-tenant',
        email: 'submitter@example.com',
      },
      {
        staffId,
        leaveTypeId,
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        reason: 'Tenant isolation',
      },
      false,
    );

    await expect(
      approvalActionsService.approve(orgBId, leaveRequest.approvalRequestId!, {
        userId: levelOneApproverId,
        organizationId: orgBId,
        sessionId: 'session-tenant',
        email: 'level1@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('serializes concurrent approve/reject actions', async () => {
    const leaveRequest = await leaveRequestsService.create(
      orgAId,
      {
        userId: submitterUserId,
        organizationId: orgAId,
        sessionId: 'session-concurrency',
        email: 'submitter@example.com',
      },
      {
        staffId,
        leaveTypeId,
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        reason: 'Concurrency',
      },
      false,
    );

    const results = await Promise.allSettled([
      approvalActionsService.approve(orgAId, leaveRequest.approvalRequestId!, {
        userId: levelOneApproverId,
        organizationId: orgAId,
        sessionId: 'session-concurrency',
        email: 'level1@example.com',
      }),
      approvalActionsService.reject(orgAId, leaveRequest.approvalRequestId!, {
        userId: levelOneApproverId,
        organizationId: orgAId,
        sessionId: 'session-concurrency',
        email: 'level1@example.com',
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const approval = await approvalRequestsService.findById(
      orgAId,
      leaveRequest.approvalRequestId!,
    );
    expect([ApprovalRequestStatus.APPROVED, ApprovalRequestStatus.REJECTED]).toContain(
      approval.status,
    );
    expect(approval.status).not.toBe(ApprovalRequestStatus.PENDING);
  });
});
