import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AttendanceStatus,
  EmploymentStatus,
  PrismaClient,
  StudentStatus,
  UserStatus,
} from '@prisma/client';
import { PasswordService } from '../auth/services/password.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
} from '../permissions/constants/system-roles';
import { PrismaService } from '../prisma/prisma.service';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { DashboardService } from './dashboard.service';
import { toFeeDecimal } from '../fees/utils/fee-amount.util';
import { getLocalDateString } from './utils/dashboard-date.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Dashboard integration', () => {
  let prisma: PrismaClient;
  let dashboardService: DashboardService;
  let permissionsGuard: PermissionsGuard;
  let schoolOrgId: string;
  let otherOrgId: string;
  let schoolAdminUserId: string;
  let schoolAdminEmail: string;
  let otherOrgAdminUserId: string;
  let otherOrgAdminEmail: string;
  let attendanceDate: string;

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

    dashboardService = new DashboardService(
      prisma as unknown as PrismaService,
      new PermissionsService(prisma as unknown as PrismaService),
    );
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const suffix = Date.now();
    const schoolOrg = await prisma.organization.create({
      data: {
        name: 'Dashboard School',
        code: `dashboard-school-${suffix}`,
      },
    });
    schoolOrgId = schoolOrg.id;
    await prisma.organizationSettings.create({
      data: {
        organizationId: schoolOrgId,
        timezone: 'UTC',
      },
    });

    const otherOrg = await prisma.organization.create({
      data: {
        name: 'Other Dashboard School',
        code: `other-dashboard-${suffix}`,
      },
    });
    otherOrgId = otherOrg.id;
    await prisma.organizationSettings.create({
      data: { organizationId: otherOrgId, timezone: 'UTC' },
    });

    attendanceDate = getLocalDateString('UTC');

    const schoolAdminRoleDef = ORGANIZATION_ROLE_DEFINITIONS.find(
      (role) => role.code === ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN,
    )!;
    const schoolAdminRole = await prisma.role.create({
      data: {
        organizationId: schoolOrgId,
        code: schoolAdminRoleDef.code,
        name: schoolAdminRoleDef.name,
      },
    });
    for (const permissionCode of schoolAdminRoleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.create({
        data: { roleId: schoolAdminRole.id, permissionId: permission.id },
      });
    }

    schoolAdminEmail = `dashboard-admin-${suffix}@example.com`;
    const schoolAdmin = await prisma.user.create({
      data: {
        organizationId: schoolOrgId,
        email: schoolAdminEmail,
        passwordHash: await new PasswordService().hash('SchoolAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    schoolAdminUserId = schoolAdmin.id;
    await prisma.userRole.create({
      data: { userId: schoolAdminUserId, roleId: schoolAdminRole.id },
    });

    const otherAdminRole = await prisma.role.create({
      data: {
        organizationId: otherOrgId,
        code: schoolAdminRoleDef.code,
        name: schoolAdminRoleDef.name,
      },
    });
    for (const permissionCode of schoolAdminRoleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.create({
        data: { roleId: otherAdminRole.id, permissionId: permission.id },
      });
    }
    otherOrgAdminEmail = `other-dashboard-admin-${suffix}@example.com`;
    const otherOrgAdmin = await prisma.user.create({
      data: {
        organizationId: otherOrgId,
        email: otherOrgAdminEmail,
        passwordHash: await new PasswordService().hash('SchoolAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    otherOrgAdminUserId = otherOrgAdmin.id;
    await prisma.userRole.create({
      data: { userId: otherOrgAdminUserId, roleId: otherAdminRole.id },
    });

    const staff = await prisma.staff.create({
      data: {
        organizationId: schoolOrgId,
        employeeCode: `dash-staff-${suffix}`,
        firstName: 'Dash',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    });

    await prisma.student.create({
      data: {
        organizationId: schoolOrgId,
        studentCode: `dash-stu-${suffix}`,
        firstName: 'Dash',
        lastName: 'Student',
        status: StudentStatus.ACTIVE,
      },
    });

    await prisma.staffAttendance.create({
      data: {
        organizationId: schoolOrgId,
        staffId: staff.id,
        attendanceDate: parseAttendanceDate(attendanceDate),
        status: AttendanceStatus.PRESENT,
      },
    });

    const feeStructure = await prisma.feeStructure.create({
      data: {
        organizationId: schoolOrgId,
        name: 'Tuition',
        amount: toFeeDecimal(1000),
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2027-03-31'),
      },
    });
    const student = await prisma.student.findFirstOrThrow({ where: { organizationId: schoolOrgId } });
    await prisma.studentFee.create({
      data: {
        organizationId: schoolOrgId,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        amount: toFeeDecimal(1000),
      },
    });

    await prisma.student.createMany({
      data: [
        {
          organizationId: otherOrgId,
          studentCode: `other-stu-1-${suffix}`,
          firstName: 'Other',
          lastName: 'One',
          status: StudentStatus.ACTIVE,
        },
        {
          organizationId: otherOrgId,
          studentCode: `other-stu-2-${suffix}`,
          firstName: 'Other',
          lastName: 'Two',
          status: StudentStatus.ACTIVE,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns dashboard summary with accurate metrics', async () => {
    const summary = await dashboardService.getSummary({
      userId: schoolAdminUserId,
      organizationId: schoolOrgId,
      sessionId: 'session-1',
      email: schoolAdminEmail,
    });

    expect(summary.localDate).toBe(attendanceDate);
    expect(summary.metrics.students).toBe(1);
    expect(summary.metrics.activeStaff).toBe(1);
    expect(summary.metrics.todayAttendance?.present).toBe(1);
    expect(summary.metrics.outstandingFees?.totalOutstanding).toBe(1000);
  });

  it('allows school admin permission guard for dashboard endpoint', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['dashboard.view']);

    await expect(
      permissionsGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: schoolAdminUserId,
              organizationId: schoolOrgId,
              sessionId: 'session-1',
              email: schoolAdminEmail,
            },
          }),
        }),
        getHandler: () => () => undefined,
        getClass: () => class TestController {},
      } as unknown as ExecutionContext),
    ).resolves.toBe(true);
  });

  it('rejects platform organization dashboard access', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      dashboardService.getSummary({
        userId: schoolAdminUserId,
        organizationId: platformOrg.id,
        sessionId: 'session-1',
        email: schoolAdminEmail,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes student counts to the authenticated organization', async () => {
    const schoolSummary = await dashboardService.getSummary({
      userId: schoolAdminUserId,
      organizationId: schoolOrgId,
      sessionId: 'session-1',
      email: schoolAdminEmail,
    });

    const otherSummary = await dashboardService.getSummary({
      userId: otherOrgAdminUserId,
      organizationId: otherOrgId,
      sessionId: 'session-1',
      email: otherOrgAdminEmail,
    });

    expect(schoolSummary.metrics.students).toBe(1);
    expect(otherSummary.metrics.students).toBe(2);
  });
});
