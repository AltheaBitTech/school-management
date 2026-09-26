import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LeaveRequestStatus, PrismaClient, UserStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PasswordService } from '../../auth/services/password.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { parseLeaveDate } from '../../leave/utils/leave.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PermissionsService } from '../../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../../permissions/constants/system-permissions';
import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
} from '../../permissions/constants/system-roles';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveReportsController } from './leave-reports.controller';
import { LeaveReportsService } from './leave-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Leave reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: LeaveReportsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let deptAId: string;
  let staffAId: string;
  let staffBId: string;
  let leaveTypeAId: string;
  let schoolAdminUserId: string;
  let schoolAdminEmail: string;

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

    reportsService = new LeaveReportsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const suffix = Date.now();
    const orgA = await prisma.organization.create({
      data: { name: 'Leave Report School A', code: `leave-report-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Leave Report School B', code: `leave-report-b-${suffix}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.createMany({
      data: [
        { organizationId: orgAId, timezone: 'UTC' },
        { organizationId: orgBId, timezone: 'UTC' },
      ],
    });

    const deptA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'Administration', code: `adm-${suffix}` },
    });
    deptAId = deptA.id;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `la-${suffix}`,
        firstName: 'Leave',
        lastName: 'Alice',
        departmentId: deptAId,
      },
    });
    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: `lb-${suffix}`,
        firstName: 'Leave',
        lastName: 'Bob',
      },
    });
    staffAId = staffA.id;
    staffBId = staffB.id;

    const leaveTypeA = await prisma.leaveType.create({
      data: {
        organizationId: orgAId,
        name: 'Casual Leave',
        code: `casual-${suffix}`,
      },
    });
    leaveTypeAId = leaveTypeA.id;

    await prisma.leaveRequest.createMany({
      data: [
        {
          organizationId: orgAId,
          staffId: staffAId,
          leaveTypeId: leaveTypeAId,
          startDate: parseLeaveDate('2026-09-25'),
          endDate: parseLeaveDate('2026-09-27'),
          duration: new Decimal(3),
          status: LeaveRequestStatus.APPROVED,
        },
        {
          organizationId: orgAId,
          staffId: staffAId,
          leaveTypeId: leaveTypeAId,
          startDate: parseLeaveDate('2026-10-01'),
          endDate: parseLeaveDate('2026-10-01'),
          duration: new Decimal(1),
          status: LeaveRequestStatus.PENDING_APPROVAL,
        },
        {
          organizationId: orgBId,
          staffId: staffBId,
          leaveTypeId: (
            await prisma.leaveType.create({
              data: {
                organizationId: orgBId,
                name: 'Other Leave',
                code: `other-${suffix}`,
              },
            })
          ).id,
          startDate: parseLeaveDate('2026-09-25'),
          endDate: parseLeaveDate('2026-09-25'),
          duration: new Decimal(1),
          status: LeaveRequestStatus.APPROVED,
        },
      ],
    });

    const schoolAdminRoleDef = ORGANIZATION_ROLE_DEFINITIONS.find(
      (role) => role.code === ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    )!;
    const schoolAdminRole = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: schoolAdminRoleDef.code,
        name: schoolAdminRoleDef.name,
      },
    });
    for (const permissionCode of schoolAdminRoleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });
      await prisma.rolePermission.create({
        data: { roleId: schoolAdminRole.id, permissionId: permission.id },
      });
    }

    schoolAdminEmail = `leave-report-admin-${suffix}@example.com`;
    const schoolAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        email: schoolAdminEmail,
        passwordHash: await new PasswordService().hash('SchoolAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    schoolAdminUserId = schoolAdmin.id;
    await prisma.userRole.create({
      data: { userId: schoolAdminUserId, roleId: schoolAdminRole.id },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns overlap-filtered summary and records for org A', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(report.summary.totalRequests).toBe(1);
    expect(report.summary.approved).toBe(1);
    expect(report.summary.pending).toBe(0);
    expect(report.summary.leaveDaysApproved).toBe(3);
    expect(report.data).toHaveLength(1);
    expect(report.breakdown.byDepartment[0]?.departmentName).toBe('Administration');
  });

  it('returns all pending requests when status filter is used without dates', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      status: LeaveRequestStatus.PENDING_APPROVAL,
    });

    expect(report.summary.dateFilterApplied).toBe(false);
    expect(report.summary.pending).toBe(1);
    expect(report.summary.totalRequests).toBe(1);
  });

  it('scopes leave data to the authenticated organization', async () => {
    const reportA = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    const reportB = await reportsService.generate(orgBId, {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });

    expect(reportA.summary.totalRequests).toBe(1);
    expect(reportB.summary.totalRequests).toBe(1);
    expect(reportA.data.every((row) => row.staffName !== 'Leave Bob')).toBe(true);
  });

  it('rejects platform organization leave reports', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      reportsService.generate(platformOrg.id, { page: 1, pageSize: 25, date: '2026-09-25' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows school admin permission guard for leave report endpoint', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['report.leave.view']);

    await expect(
      permissionsGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: schoolAdminUserId,
              organizationId: orgAId,
              sessionId: 'session-1',
              email: schoolAdminEmail,
            },
          }),
        }),
        getHandler: () => LeaveReportsController.prototype.generate,
        getClass: () => LeaveReportsController,
      } as unknown as ExecutionContext),
    ).resolves.toBe(true);
  });
});
