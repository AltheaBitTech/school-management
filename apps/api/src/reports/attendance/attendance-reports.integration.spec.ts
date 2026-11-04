import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AttendanceStatus,
  EmploymentStatus,
  PrismaClient,
  UserStatus,
} from '@prisma/client';
import { PasswordService } from '../../auth/services/password.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { parseAttendanceDate } from '../../attendance/utils/attendance-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PermissionsService } from '../../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../../permissions/constants/system-permissions';
import {
  ORGANIZATION_ROLE_CODES,
  ORGANIZATION_ROLE_DEFINITIONS,
} from '../../permissions/constants/system-roles';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceReportsController } from './attendance-reports.controller';
import { AttendanceReportsService } from './attendance-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Attendance reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: AttendanceReportsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let deptAId: string;
  let staffA1Id: string;
  let staffA2Id: string;
  let staffBId: string;
  let schoolAdminUserId: string;
  let schoolAdminEmail: string;
  let schoolAdminRoleId: string;

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

    reportsService = new AttendanceReportsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const suffix = Date.now();
    const orgA = await prisma.organization.create({
      data: { name: 'Attendance Report School A', code: `att-report-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Attendance Report School B', code: `att-report-b-${suffix}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.createMany({
      data: [
        { organizationId: orgAId, timezone: 'Asia/Kolkata' },
        { organizationId: orgBId, timezone: 'UTC' },
      ],
    });

    const deptA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'Science', code: `sci-${suffix}` },
    });
    deptAId = deptA.id;

    const staffA1 = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `a1-${suffix}`,
        firstName: 'Alice',
        lastName: 'Admin',
        employmentStatus: EmploymentStatus.ACTIVE,
        departmentId: deptAId,
      },
    });
    const staffA2 = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `a2-${suffix}`,
        firstName: 'Bob',
        lastName: 'Teacher',
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    });
    staffA1Id = staffA1.id;
    staffA2Id = staffA2.id;

    const staffB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: `b1-${suffix}`,
        firstName: 'Other',
        lastName: 'Staff',
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    });
    staffBId = staffB.id;

    await prisma.staffAttendance.createMany({
      data: [
        {
          organizationId: orgAId,
          staffId: staffA1Id,
          attendanceDate: parseAttendanceDate('2026-09-25'),
          status: AttendanceStatus.PRESENT,
        },
        {
          organizationId: orgAId,
          staffId: staffA2Id,
          attendanceDate: parseAttendanceDate('2026-09-25'),
          status: AttendanceStatus.ABSENT,
        },
        {
          organizationId: orgBId,
          staffId: staffBId,
          attendanceDate: parseAttendanceDate('2026-09-25'),
          status: AttendanceStatus.PRESENT,
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

    schoolAdminEmail = `att-report-admin-${suffix}@example.com`;
    const schoolAdmin = await prisma.user.create({
      data: {
        organizationId: orgAId,
        email: schoolAdminEmail,
        passwordHash: await new PasswordService().hash('SchoolAdmin123!'),
        status: UserStatus.ACTIVE,
      },
    });
    schoolAdminUserId = schoolAdmin.id;
    schoolAdminRoleId = schoolAdminRole.id;
    await prisma.userRole.create({
      data: { userId: schoolAdminUserId, roleId: schoolAdminRole.id },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns single-day summary, breakdown, records, and pagination for org A', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });

    expect(report.summary.scope).toBe('single_day');
    expect(report.summary.activeStaff).toBe(2);
    expect(report.summary.totalMarked).toBe(2);
    expect(report.summary.present).toBe(1);
    expect(report.summary.absent).toBe(1);
    expect(report.summary.unmarked).toBe(0);
    expect(report.summary.attendancePercentage).toBe(50);
    expect(report.data).toHaveLength(2);
    expect(report.breakdown.byDepartment.some((row) => row.departmentName === 'Science')).toBe(
      true,
    );
  });

  it('filters by department and status', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
      departmentId: deptAId,
      status: AttendanceStatus.PRESENT,
    });

    expect(report.summary.totalMarked).toBe(1);
    expect(report.data).toHaveLength(1);
    expect(report.data[0]?.staffName).toContain('Alice');
  });

  it('scopes attendance data to the authenticated organization', async () => {
    const reportA = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });
    const reportB = await reportsService.generate(orgBId, {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });

    expect(reportA.summary.totalMarked).toBe(2);
    expect(reportB.summary.totalMarked).toBe(1);
    expect(reportA.data.every((row) => row.staffName !== 'Other Staff')).toBe(true);
  });

  it('rejects platform organization attendance reports', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      reportsService.generate(platformOrg.id, { page: 1, pageSize: 25, date: '2026-09-25' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows school admin permission guard for attendance report endpoint', async () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['report.attendance.view']);

    await expect(
      permissionsGuard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            user: {
              userId: schoolAdminUserId,
              organizationId: orgAId,
              sessionId: 'session-1',
              email: schoolAdminEmail,
              activeRoleId: schoolAdminRoleId,
            },
          }),
        }),
        getHandler: () => AttendanceReportsController.prototype.generate,
        getClass: () => AttendanceReportsController,
      } as unknown as ExecutionContext),
    ).resolves.toBe(true);
  });
});
