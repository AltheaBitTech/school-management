import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient, VisitorStatus } from '@prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../../permissions/constants/system-permissions';
import { getLocalDayUtcRange } from '../../dashboard/utils/dashboard-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { VisitorsReportsService } from './visitors-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Visitors reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: VisitorsReportsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let hostAId: string;
  let departmentAId: string;
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

    reportsService = new VisitorsReportsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const orgA = await prisma.organization.create({
      data: { name: 'Visitor Report A', code: `visitor-report-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Visitor Report B', code: `visitor-report-b-${suffix}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    await prisma.organizationSettings.createMany({
      data: [
        { organizationId: orgAId, timezone: 'UTC' },
        { organizationId: orgBId, timezone: 'UTC' },
      ],
    });

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `visitor-report-admin-${suffix}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `visitor-report-b-${suffix}@example.com` },
    });
    userAId = userA.id;

    const departmentA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'Admin', code: `adm-${suffix}` },
    });
    departmentAId = departmentA.id;

    const hostA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `vr-host-${suffix}`,
        firstName: 'Host',
        lastName: 'Alpha',
        departmentId: departmentAId,
      },
    });
    hostAId = hostA.id;

    const hostB = await prisma.staff.create({
      data: {
        organizationId: orgBId,
        employeeCode: `vr-host-b-${suffix}`,
        firstName: 'Host',
        lastName: 'Beta',
      },
    });

    const dayRange = getLocalDayUtcRange('2026-09-25', 'UTC');

    await prisma.visitor.createMany({
      data: [
        {
          organizationId: orgAId,
          visitorCode: `VR-${suffix}-001`,
          name: 'Active Visitor',
          mobile: '9000000001',
          purpose: 'Parent meeting',
          hostStaffId: hostAId,
          checkInAt: new Date('2026-09-25T09:00:00.000Z'),
          status: VisitorStatus.CHECKED_IN,
          createdByUserId: userAId,
        },
        {
          organizationId: orgAId,
          visitorCode: `VR-${suffix}-002`,
          name: 'Departed Visitor',
          mobile: '9000000002',
          purpose: 'Vendor delivery',
          hostStaffId: hostAId,
          checkInAt: new Date('2026-09-25T11:00:00.000Z'),
          checkOutAt: new Date('2026-09-25T12:00:00.000Z'),
          status: VisitorStatus.CHECKED_OUT,
          createdByUserId: userAId,
        },
        {
          organizationId: orgAId,
          visitorCode: `VR-${suffix}-003`,
          name: 'Earlier Visitor',
          mobile: '9000000003',
          purpose: 'Parent meeting',
          hostStaffId: hostAId,
          checkInAt: new Date('2026-09-20T10:00:00.000Z'),
          status: VisitorStatus.CHECKED_OUT,
          createdByUserId: userAId,
        },
        {
          organizationId: orgBId,
          visitorCode: `VR-${suffix}-B01`,
          name: 'Org B Visitor',
          mobile: '9000000099',
          purpose: 'Should not appear',
          hostStaffId: hostB.id,
          checkInAt: dayRange.startUtc,
          status: VisitorStatus.CHECKED_IN,
          createdByUserId: userB.id,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.visitorHistory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.visitor.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.staff.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.department.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationSettings.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('scopes report data to organization A', async () => {
    const report = await reportsService.generate(orgAId, { page: 1, pageSize: 25 });
    expect(report.summary.totalVisits).toBe(3);
    expect(report.data.every((row) => row.name !== 'Org B Visitor')).toBe(true);
  });

  it('filters by check-in date using organization timezone (dashboard today semantics)', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      date: '2026-09-25',
    });
    expect(report.summary.checkedInOnSelectedDay).toBe(2);
    expect(report.summary.totalVisits).toBe(2);
    expect(report.summary.checkedInVisits).toBe(1);
    expect(report.summary.checkedOutVisits).toBe(1);
  });

  it('filters by status, host, department, and purpose', async () => {
    const byStatus = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      status: VisitorStatus.CHECKED_IN,
    });
    expect(byStatus.summary.totalVisits).toBe(1);

    const byHost = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      hostStaffId: hostAId,
    });
    expect(byHost.summary.totalVisits).toBe(3);

    const byDepartment = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      departmentId: departmentAId,
    });
    expect(byDepartment.summary.totalVisits).toBe(3);

    const byPurpose = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      purpose: 'parent',
    });
    expect(byPurpose.summary.totalVisits).toBe(2);
  });

  it('reports active on campus using CHECKED_IN status organization-wide', async () => {
    const report = await reportsService.generate(orgAId, { page: 1, pageSize: 25 });
    expect(report.summary.activeOnCampus).toBe(1);
  });

  it('paginates detailed rows', async () => {
    const page1 = await reportsService.generate(orgAId, { page: 1, pageSize: 1 });
    const page2 = await reportsService.generate(orgAId, { page: 2, pageSize: 1 });
    expect(page1.data).toHaveLength(1);
    expect(page2.data).toHaveLength(1);
    expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
  });

  it('blocks platform organization visitor reports', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      reportsService.generate(platformOrg.id, { page: 1, pageSize: 25 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows report.visitors.view permission guard', async () => {
    const role = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `VISITOR_REPORT_${suffix}`,
        name: 'Visitor Report',
      },
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: 'report.visitors.view' },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    await prisma.userRole.create({ data: { userId: userAId, roleId: role.id } });

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['report.visitors.view']);
    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        email: 'admin@example.com',
        sessionId: 'session',
      },
    };
    const allowed = await permissionsGuard.canActivate({
      ...context,
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext);
    expect(allowed).toBe(true);

    await prisma.userRole.deleteMany({ where: { userId: userAId, roleId: role.id } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.role.delete({ where: { id: role.id } });
  });
});
