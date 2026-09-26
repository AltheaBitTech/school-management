import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceReportsService } from '../reports/attendance/attendance-reports.service';
import { FeesReportsService } from '../reports/fees/fees-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

const STAFF_SELF_PERMISSIONS = [
  'staff.self.view',
  'staff.self.attendance.view',
  'staff.self.leave.view',
  'staff.self.leave.create',
];

const REPORT_PERMISSIONS = [
  'report.attendance.view',
  'report.leave.view',
  'report.fees.view',
  'report.complaints.view',
  'report.visitors.view',
  'report.event.view',
];

describeIfDatabase('Release hardening integration', () => {
  let prisma: PrismaClient;
  let permissionsGuard: PermissionsGuard;
  let permissionsService: PermissionsService;
  let attendanceReportsService: AttendanceReportsService;
  let feesReportsService: FeesReportsService;
  let orgAId: string;
  let orgBId: string;
  let staffUserId: string;
  let suffix: number;

  beforeAll(async () => {
    jest.setTimeout(120_000);
    prisma = new PrismaClient();
    await prisma.$connect();
    suffix = Date.now();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
    attendanceReportsService = new AttendanceReportsService(prisma as unknown as PrismaService);
    feesReportsService = new FeesReportsService(prisma as unknown as PrismaService);

    const orgA = await prisma.organization.create({
      data: { name: 'Hardening A', code: `hardening-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Hardening B', code: `hardening-b-${suffix}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.createMany({
      data: [
        { organizationId: orgAId, timezone: 'UTC' },
        { organizationId: orgBId, timezone: 'UTC' },
      ],
    });

    const staffUser = await prisma.user.create({
      data: {
        organizationId: orgAId,
        email: `staff-hardening-${suffix}@example.com`,
        passwordHash: 'hash',
        status: 'ACTIVE',
      },
    });
    staffUserId = staffUser.id;

    const staffRole = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `${ORGANIZATION_ROLE_CODES.STAFF}-${suffix}`,
        name: 'Staff',
      },
    });

    const staffPermissionRecords = await prisma.permission.findMany({
      where: { code: { in: STAFF_SELF_PERMISSIONS } },
    });

    await prisma.rolePermission.createMany({
      data: staffPermissionRecords.map((permission) => ({
        roleId: staffRole.id,
        permissionId: permission.id,
      })),
    });

    await prisma.userRole.create({
      data: { userId: staffUserId, roleId: staffRole.id },
    });
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({ where: { user: { organizationId: { in: [orgAId, orgBId] } } } });
    await prisma.rolePermission.deleteMany({ where: { role: { organizationId: orgAId } } });
    await prisma.role.deleteMany({ where: { organizationId: orgAId } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationSettings.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  function buildGuardContext(requiredPermissions: string[], userId: string, organizationId: string) {
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(requiredPermissions);

    return {
      context,
      request: {
        user: {
          userId,
          organizationId,
          email: 'staff@example.com',
          sessionId: 'session',
        },
      },
    };
  }

  it('denies organization report permissions for staff self-service users', async () => {
    for (const permission of REPORT_PERMISSIONS) {
      const { context, request } = buildGuardContext([permission], staffUserId, orgAId);
      await expect(
        permissionsGuard.canActivate({
          ...context,
          switchToHttp: () => ({ getRequest: () => request }),
        } as ExecutionContext),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('keeps attendance and fee reports tenant-scoped', async () => {
    const reportA = await attendanceReportsService.generate(orgAId, { page: 1, pageSize: 25 });
    const reportB = await attendanceReportsService.generate(orgBId, { page: 1, pageSize: 25 });

    expect(reportA.summary.totalMarked).toBe(0);
    expect(reportB.summary.totalMarked).toBe(0);

    const feesA = await feesReportsService.generate(orgAId, { page: 1, pageSize: 25 });
    const feesB = await feesReportsService.generate(orgBId, { page: 1, pageSize: 25 });

    expect(feesA.summary.assignedFeeCount).toBe(0);
    expect(feesB.summary.assignedFeeCount).toBe(0);
  });
});
