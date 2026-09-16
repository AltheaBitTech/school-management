import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EmploymentStatus,
  PrismaClient,
  VisitorHistoryEvent,
  VisitorStatus,
} from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { VisitorsService } from './visitors.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Visitors integration', () => {
  let prisma: PrismaClient;
  let visitorsService: VisitorsService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let staffAId: string;
  let staffBId: string;
  let offboardedStaffAId: string;
  let inactiveStaffAId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'session-a',
    email: 'admin-a@example.com',
  };

  const actorB = {
    userId: '',
    organizationId: '',
    sessionId: 'session-b',
    email: 'admin-b@example.com',
  };

  const basePayload = {
    name: 'Ramesh Kumar',
    mobile: '9876543210',
    organizationName: 'ABC Services',
    vehicleNumber: 'AP39AB1234',
    purpose: 'Meeting with Principal',
    remarks: 'Vendor representative',
  };

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
      data: { name: 'Visitor School A', code: `visitor-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Visitor School B', code: `visitor-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `visitor-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `visitor-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;
    actorB.userId = userBId;
    actorB.organizationId = orgBId;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'vis-staff-a',
        firstName: 'Host',
        lastName: 'StaffA',
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: 'vis-staff-b',
        firstName: 'Host',
        lastName: 'StaffB',
      },
    });
    const offboardedStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'vis-offboarded',
        firstName: 'Offboarded',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.OFFBOARDED,
      },
    });
    const inactiveStaff = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: 'vis-inactive',
        firstName: 'Inactive',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.OFFBOARDING,
      },
    });

    staffAId = staffA.id;
    staffBId = staffB.id;
    offboardedStaffAId = offboardedStaff.id;
    inactiveStaffAId = inactiveStaff.id;

    visitorsService = new VisitorsService(prisma as unknown as PrismaService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.visitorHistory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.visitor.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('creates visitors with generated codes, check-in, and initial history', async () => {
    const before = Date.now();
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      hostStaffId: staffAId,
    });
    const after = Date.now();

    expect(visitor.organizationId).toBe(orgAId);
    expect(visitor.visitorCode).toBe('VIS-000001');
    expect(visitor.status).toBe(VisitorStatus.CHECKED_IN);
    expect(visitor.createdByUserId).toBe(userAId);
    expect(visitor.checkInAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(visitor.checkInAt.getTime()).toBeLessThanOrEqual(after);
    expect(visitor.checkOutAt).toBeNull();
    expect(visitor.history).toHaveLength(1);
    expect(visitor.history[0]?.eventType).toBe(VisitorHistoryEvent.CHECKED_IN);
    expect(visitor.history[0]?.actorUserId).toBe(userAId);
  });

  it('accepts active same-tenant host staff', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Same tenant host',
      hostStaffId: staffAId,
    });

    expect(visitor.hostStaffId).toBe(staffAId);
  });

  it('rejects cross-tenant host staff', async () => {
    await expect(
      visitorsService.create(orgAId, actorA, {
        ...basePayload,
        hostStaffId: staffBId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects nonexistent host staff', async () => {
    await expect(
      visitorsService.create(orgAId, actorA, {
        ...basePayload,
        hostStaffId: '00000000-0000-4000-8000-000000000099',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects offboarded host staff', async () => {
    await expect(
      visitorsService.create(orgAId, actorA, {
        ...basePayload,
        hostStaffId: offboardedStaffAId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inactive host staff', async () => {
    await expect(
      visitorsService.create(orgAId, actorA, {
        ...basePayload,
        hostStaffId: inactiveStaffAId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists visitors within a tenant and defaults to checked-in visitors', async () => {
    const created = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Listed Visitor',
      hostStaffId: staffAId,
    });

    const listed = await visitorsService.list(orgAId, { page: 1, pageSize: 10 });
    expect(listed.data.some((item) => item.id === created.id)).toBe(true);
    expect(listed.data.every((item) => item.status === VisitorStatus.CHECKED_IN)).toBe(true);
  });

  it('returns correct pagination metadata and page-limited results', async () => {
    const prefix = `pag-meta-${Date.now()}`;

    for (let index = 1; index <= 15; index += 1) {
      await visitorsService.create(orgAId, actorA, {
        ...basePayload,
        name: `${prefix} Visitor ${index}`,
        hostStaffId: staffAId,
      });
    }

    const listed = await visitorsService.list(orgAId, {
      page: 1,
      pageSize: 10,
      search: prefix,
    });

    expect(listed.meta.page).toBe(1);
    expect(listed.meta.pageSize).toBe(10);
    expect(listed.meta.total).toBe(15);
    expect(listed.meta.totalPages).toBe(2);
    expect(listed.data).toHaveLength(10);
  });

  it('treats whitespace-only search as no search while preserving default status filter', async () => {
    const checkedOut = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: `Whitespace filter checked out ${Date.now()}`,
      hostStaffId: staffAId,
    });
    await visitorsService.checkOut(orgAId, checkedOut.id, actorA);

    const checkedIn = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: `Whitespace filter checked in ${Date.now()}`,
      hostStaffId: staffAId,
    });

    const withoutSearch = await visitorsService.list(orgAId, { page: 1, pageSize: 100 });
    const withWhitespaceSearch = await visitorsService.list(orgAId, {
      page: 1,
      pageSize: 100,
      search: '   ',
    });

    expect(withWhitespaceSearch.data.every((item) => item.status === VisitorStatus.CHECKED_IN)).toBe(
      true,
    );
    expect(withoutSearch.data.every((item) => item.status === VisitorStatus.CHECKED_IN)).toBe(true);
    expect(withWhitespaceSearch.data.some((item) => item.id === checkedOut.id)).toBe(false);
    expect(withWhitespaceSearch.data.some((item) => item.id === checkedIn.id)).toBe(true);
  });

  it('blocks cross-tenant list access by scoping results', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Tenant A only',
      hostStaffId: staffAId,
    });

    const tenantBList = await visitorsService.list(orgBId, { page: 1, pageSize: 50 });
    expect(tenantBList.data.some((item) => item.id === visitor.id)).toBe(false);
  });

  it('blocks cross-tenant detail access', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Tenant A detail',
      hostStaffId: staffAId,
    });

    await expect(visitorsService.findById(orgBId, visitor.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks cross-tenant history access', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Tenant A history',
      hostStaffId: staffAId,
    });

    await expect(visitorsService.listHistory(orgBId, visitor.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('blocks cross-tenant checkout attempts', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Tenant A checkout',
      hostStaffId: staffAId,
    });

    await expect(visitorsService.checkOut(orgBId, visitor.id, actorB)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('checks out checked-in visitors and records history', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Checkout visitor',
      hostStaffId: staffAId,
    });

    const before = Date.now();
    const checkedOut = await visitorsService.checkOut(orgAId, visitor.id, actorA);
    const after = Date.now();

    expect(checkedOut.status).toBe(VisitorStatus.CHECKED_OUT);
    expect(checkedOut.checkOutAt).not.toBeNull();
    expect(checkedOut.checkOutAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(checkedOut.checkOutAt!.getTime()).toBeLessThanOrEqual(after);
    expect(checkedOut.history.some((entry) => entry.eventType === VisitorHistoryEvent.CHECKED_OUT)).toBe(
      true,
    );
  });

  it('rejects checkout when visitor is already checked out', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Already checked out',
      hostStaffId: staffAId,
    });

    await visitorsService.checkOut(orgAId, visitor.id, actorA);

    await expect(visitorsService.checkOut(orgAId, visitor.id, actorA)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows only one concurrent checkout and creates a single checkout history entry', async () => {
    const visitor = await visitorsService.create(orgAId, actorA, {
      ...basePayload,
      name: 'Concurrent checkout',
      hostStaffId: staffAId,
    });

    const results = await Promise.allSettled([
      visitorsService.checkOut(orgAId, visitor.id, actorA),
      visitorsService.checkOut(orgAId, visitor.id, actorA),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictException);

    const refreshed = await visitorsService.findById(orgAId, visitor.id);
    expect(refreshed.status).toBe(VisitorStatus.CHECKED_OUT);
    expect(
      refreshed.history.filter((entry) => entry.eventType === VisitorHistoryEvent.CHECKED_OUT),
    ).toHaveLength(1);
  });

  it('denies visitor view permission when visitor.view is missing', async () => {
    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce([]);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['visitor.view']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies visitor create permission when visitor.create is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['visitor.view']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['visitor.create']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies visitor checkout permission when visitor.checkout is missing', async () => {
    jest
      .spyOn(permissionsService, 'getEffectivePermissions')
      .mockResolvedValueOnce(['visitor.view', 'visitor.create']);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['visitor.checkout']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
