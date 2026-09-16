import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeaveRequestStatus, PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveTypesService } from './leave-types.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Leave integration', () => {
  let prisma: PrismaClient;
  let leaveTypesService: LeaveTypesService;
  let leaveBalancesService: LeaveBalancesService;
  let leaveRequestsService: LeaveRequestsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let staffAId: string;
  let staffBId: string;
  let staffCId: string;
  let userAId: string;
  let approverUserId: string;
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

    const orgA = await prisma.organization.create({
      data: { name: 'Leave School A', code: `leave-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Leave School B', code: `leave-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `leave-user-a-${Date.now()}@example.com` },
    });
    userAId = userA.id;

    const approverUser = await prisma.user.create({
      data: { organizationId: orgAId, email: `leave-approver-${Date.now()}@example.com` },
    });
    approverUserId = approverUser.id;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'leave-staff-a',
        firstName: 'Leave',
        lastName: 'StaffA',
        userId: userAId,
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: 'leave-staff-b',
        firstName: 'Leave',
        lastName: 'StaffB',
      },
    });
    const staffC = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'leave-staff-c',
        firstName: 'Leave',
        lastName: 'StaffC',
      },
    });
    staffAId = staffA.id;
    staffBId = staffB.id;
    staffCId = staffC.id;

    leaveTypesService = new LeaveTypesService(prisma as unknown as PrismaService);
    leaveBalancesService = new LeaveBalancesService(
      prisma as unknown as PrismaService,
      leaveTypesService,
    );
    leaveRequestsService = new LeaveRequestsService(
      prisma as unknown as PrismaService,
      leaveTypesService,
    );
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);

    const leaveTypeA = await leaveTypesService.create(orgAId, {
      name: 'Casual Leave',
      code: 'casual',
      tracksBalance: true,
      requiresReason: true,
    });
    const leaveTypeB = await leaveTypesService.create(orgBId, {
      name: 'Casual Leave',
      code: 'casual',
      tracksBalance: true,
    });
    leaveTypeAId = leaveTypeA.id;
    void leaveTypeB;
  });

  afterAll(async () => {
    await prisma.leaveRequest.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveBalance.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.leaveType.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates leave types and enforces tenant isolation', async () => {
    const leaveType = await leaveTypesService.findById(orgAId, leaveTypeAId);
    expect(leaveType.code).toBe('casual');

    await expect(leaveTypesService.findById(orgBId, leaveTypeAId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('initializes leave balances with tenant-safe validation', async () => {
    const balance = await leaveBalancesService.create(orgAId, {
      staffId: staffAId,
      leaveTypeId: leaveTypeAId,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      allocatedAmount: 12,
    });

    expect(balance.organizationId).toBe(orgAId);

    await expect(
      leaveBalancesService.create(orgAId, {
        staffId: staffBId,
        leaveTypeId: leaveTypeAId,
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        allocatedAmount: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates, approves, and consumes leave balance transactionally', async () => {
    const request = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'admin@example.com',
      },
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        reason: 'Personal work',
      },
      true,
    );

    expect(request.status).toBe(LeaveRequestStatus.PENDING_APPROVAL);

    const approved = await leaveRequestsService.approve(orgAId, request.id, {
      userId: approverUserId,
      organizationId: orgAId,
      sessionId: 'session-2',
      email: 'approver@example.com',
    });

    expect(approved.status).toBe(LeaveRequestStatus.APPROVED);

    const balances = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId: staffAId,
      leaveTypeId: leaveTypeAId,
    });
    expect(balances.data[0]?.usedAmount).toBe(2);
    expect(balances.data[0]?.availableAmount).toBe(10);
  });

  it('rejects duplicate overlapping leave and invalid transitions', async () => {
    await expect(
      leaveRequestsService.create(
        orgAId,
        {
          userId: userAId,
          organizationId: orgAId,
          sessionId: 'session-1',
          email: 'admin@example.com',
        },
        {
          staffId: staffAId,
          leaveTypeId: leaveTypeAId,
          startDate: '2026-03-01',
          endDate: '2026-03-01',
          reason: 'Overlap test',
        },
        true,
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    const pending = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'admin@example.com',
      },
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-04-01',
        endDate: '2026-04-01',
        reason: 'Reject me',
      },
      true,
    );

    const rejected = await leaveRequestsService.reject(orgAId, pending.id, {
      userId: approverUserId,
      organizationId: orgAId,
      sessionId: 'session-2',
      email: 'approver@example.com',
    });
    expect(rejected.status).toBe(LeaveRequestStatus.REJECTED);

    await expect(
      leaveRequestsService.approve(orgAId, pending.id, {
        userId: approverUserId,
        organizationId: orgAId,
        sessionId: 'session-2',
        email: 'approver@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows only one concurrent approval to consume a shared one-day balance', async () => {
    const concurrencyType = await leaveTypesService.create(orgAId, {
      name: 'Concurrency Leave',
      code: `concurrency-${Date.now()}`,
      tracksBalance: true,
      requiresReason: true,
    });

    await leaveBalancesService.create(orgAId, {
      staffId: staffAId,
      leaveTypeId: concurrencyType.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      allocatedAmount: 1,
    });

    const actor = {
      userId: userAId,
      organizationId: orgAId,
      sessionId: 'session-1',
      email: 'staff@example.com',
    };
    const approver = {
      userId: approverUserId,
      organizationId: orgAId,
      sessionId: 'session-2',
      email: 'approver@example.com',
    };

    const requestA = await leaveRequestsService.create(
      orgAId,
      actor,
      {
        staffId: staffAId,
        leaveTypeId: concurrencyType.id,
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        reason: 'Concurrent request A',
      },
      true,
    );

    const requestB = await leaveRequestsService.create(
      orgAId,
      actor,
      {
        staffId: staffAId,
        leaveTypeId: concurrencyType.id,
        startDate: '2026-07-02',
        endDate: '2026-07-02',
        reason: 'Concurrent request B',
      },
      true,
    );

    const results = await Promise.allSettled([
      leaveRequestsService.approve(orgAId, requestA.id, approver),
      leaveRequestsService.approve(orgAId, requestB.id, approver),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);

    const refreshedA = await leaveRequestsService.findById(orgAId, requestA.id);
    const refreshedB = await leaveRequestsService.findById(orgAId, requestB.id);
    const approvedStatuses = [refreshedA.status, refreshedB.status].filter(
      (status) => status === LeaveRequestStatus.APPROVED,
    );
    const pendingStatuses = [refreshedA.status, refreshedB.status].filter(
      (status) => status === LeaveRequestStatus.PENDING_APPROVAL,
    );

    expect(approvedStatuses).toHaveLength(1);
    expect(pendingStatuses).toHaveLength(1);

    const balances = await leaveBalancesService.list(orgAId, {
      page: 1,
      pageSize: 10,
      staffId: staffAId,
      leaveTypeId: concurrencyType.id,
    });

    expect(balances.data[0]?.usedAmount).toBe(1);
    expect(balances.data[0]?.availableAmount).toBe(0);
  });

  it('blocks self-approval and insufficient balance approval', async () => {
    const balanceLimitedType = await leaveTypesService.create(orgAId, {
      name: 'Limited Leave',
      code: `limited-${Date.now()}`,
      tracksBalance: true,
      requiresReason: true,
    });

    await leaveBalancesService.create(orgAId, {
      staffId: staffAId,
      leaveTypeId: balanceLimitedType.id,
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      allocatedAmount: 1,
    });

    const request = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'staff@example.com',
      },
      {
        staffId: staffAId,
        leaveTypeId: balanceLimitedType.id,
        startDate: '2026-05-01',
        endDate: '2026-05-03',
        reason: 'Need more than available',
      },
      true,
    );

    await expect(
      leaveRequestsService.approve(orgAId, request.id, {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-2',
        email: 'staff@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      leaveRequestsService.approve(orgAId, request.id, {
        userId: approverUserId,
        organizationId: orgAId,
        sessionId: 'session-2',
        email: 'approver@example.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks cross-tenant leave request reads and approvals', async () => {
    const request = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'admin@example.com',
      },
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        reason: 'Tenant test',
      },
      true,
    );

    await expect(leaveRequestsService.findById(orgBId, request.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    await expect(
      leaveRequestsService.approve(orgBId, request.id, {
        userId: approverUserId,
        organizationId: orgBId,
        sessionId: 'session-2',
        email: 'approver@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows self-service leave submission without manage_balances permission', async () => {
    const request = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-self',
        email: 'staff@example.com',
      },
      {
        staffId: staffAId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        reason: 'Self submission',
      },
      false,
    );

    expect(request.staffId).toBe(staffAId);
  });

  it('blocks leave submission for another staff without manage_balances permission', async () => {
    await expect(
      leaveRequestsService.create(
        orgAId,
        {
          userId: userAId,
          organizationId: orgAId,
          sessionId: 'session-other',
          email: 'staff@example.com',
        },
        {
          staffId: staffCId,
          leaveTypeId: leaveTypeAId,
          startDate: '2026-10-02',
          endDate: '2026-10-02',
          reason: 'Should be forbidden',
        },
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows leave submission for another staff with manage_balances permission', async () => {
    const request = await leaveRequestsService.create(
      orgAId,
      {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-admin',
        email: 'admin@example.com',
      },
      {
        staffId: staffCId,
        leaveTypeId: leaveTypeAId,
        startDate: '2026-10-03',
        endDate: '2026-10-03',
        reason: 'Admin submission',
      },
      true,
    );

    expect(request.staffId).toBe(staffCId);
  });

  it('denies leave approve permission when leave.approve is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['leave.view']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-1',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['leave.approve']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
