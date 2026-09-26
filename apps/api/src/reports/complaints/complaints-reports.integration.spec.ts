import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  PrismaClient,
} from '@prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../../permissions/constants/system-permissions';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintsReportsService, computeAgeDays } from './complaints-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Complaints reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: ComplaintsReportsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let staffAId: string;
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

    reportsService = new ComplaintsReportsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const orgA = await prisma.organization.create({
      data: { name: 'Complaint Report A', code: `complaint-report-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Complaint Report B', code: `complaint-report-b-${suffix}` },
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
      data: { organizationId: orgAId, email: `complaint-report-admin-${suffix}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `complaint-report-b-${suffix}@example.com` },
    });
    userAId = userA.id;

    const departmentA = await prisma.department.create({
      data: { organizationId: orgAId, name: 'Facilities', code: `fac-${suffix}` },
    });
    departmentAId = departmentA.id;

    const staffA = await prisma.staff.create({
      data: {
        organizationId: orgAId,
        employeeCode: `cr-staff-${suffix}`,
        firstName: 'Assignee',
        lastName: 'One',
        departmentId: departmentAId,
      },
    });
    staffAId = staffA.id;

    await prisma.complaint.createMany({
      data: [
        {
          organizationId: orgAId,
          complaintCode: `CR-${suffix}-001`,
          title: 'Open IT issue',
          description: 'Network down',
          category: ComplaintCategory.IT,
          priority: ComplaintPriority.HIGH,
          status: ComplaintStatus.OPEN,
          createdByUserId: userAId,
          createdAt: new Date('2026-09-20T10:00:00.000Z'),
        },
        {
          organizationId: orgAId,
          complaintCode: `CR-${suffix}-002`,
          title: 'Assigned plumbing',
          description: 'Leak',
          category: ComplaintCategory.PLUMBING,
          priority: ComplaintPriority.MEDIUM,
          status: ComplaintStatus.ASSIGNED,
          createdByUserId: userAId,
          assignedToStaffId: staffAId,
          createdAt: new Date('2026-09-22T10:00:00.000Z'),
        },
        {
          organizationId: orgAId,
          complaintCode: `CR-${suffix}-003`,
          title: 'Closed cleaning',
          description: 'Done',
          category: ComplaintCategory.CLEANING,
          priority: ComplaintPriority.LOW,
          status: ComplaintStatus.CLOSED,
          createdByUserId: userAId,
          assignedToStaffId: staffAId,
          createdAt: new Date('2026-09-01T10:00:00.000Z'),
          closedAt: new Date('2026-09-05T10:00:00.000Z'),
        },
        {
          organizationId: orgBId,
          complaintCode: `CR-${suffix}-B01`,
          title: 'Org B only',
          description: 'Should not appear',
          category: ComplaintCategory.OTHER,
          priority: ComplaintPriority.CRITICAL,
          status: ComplaintStatus.OPEN,
          createdByUserId: userB.id,
          createdAt: new Date('2026-09-20T10:00:00.000Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.complaintHistory.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.complaint.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
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
    expect(report.summary.totalComplaints).toBe(3);
    expect(report.data.every((row) => !row.title.includes('Org B'))).toBe(true);
  });

  it('filters by status and priority', async () => {
    const byStatus = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      status: ComplaintStatus.ASSIGNED,
    });
    expect(byStatus.summary.totalComplaints).toBe(1);
    expect(byStatus.data[0]?.assigneeStaffId).toBe(staffAId);

    const byPriority = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      priority: ComplaintPriority.HIGH,
    });
    expect(byPriority.summary.totalComplaints).toBe(1);
  });

  it('filters by created date range in organization timezone', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-21',
      endDate: '2026-09-30',
    });
    expect(report.summary.dateFilterApplied).toBe(true);
    expect(report.summary.totalComplaints).toBe(1);
  });

  it('filters by department and assignee', async () => {
    const byDepartment = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      departmentId: departmentAId,
    });
    expect(byDepartment.summary.totalComplaints).toBe(2);

    const byAssignee = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      assigneeId: staffAId,
    });
    expect(byAssignee.summary.totalComplaints).toBe(2);
  });

  it('supports openOnly filter aligned with dashboard open complaints', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      openOnly: true,
    });
    expect(report.summary.totalComplaints).toBe(2);
    expect(report.summary.closedComplaints).toBe(0);
  });

  it('paginates detailed rows', async () => {
    const page1 = await reportsService.generate(orgAId, { page: 1, pageSize: 1 });
    const page2 = await reportsService.generate(orgAId, { page: 2, pageSize: 1 });
    expect(page1.data).toHaveLength(1);
    expect(page2.data).toHaveLength(1);
    expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
  });

  it('computes age using closedAt for closed complaints', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      status: ComplaintStatus.CLOSED,
    });
    const row = report.data[0];
    expect(row?.ageDays).toBe(4);
    expect(row?.closedAt).toBeTruthy();
    expect(
      computeAgeDays(
        new Date('2026-09-01T10:00:00.000Z'),
        new Date('2026-09-05T10:00:00.000Z'),
        ComplaintStatus.CLOSED,
      ),
    ).toBe(4);
  });

  it('blocks platform organization complaint reports', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      reportsService.generate(platformOrg.id, { page: 1, pageSize: 25 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows report.complaints.view permission guard', async () => {
    const role = await prisma.role.create({
      data: {
        organizationId: orgAId,
        code: `COMPLAINT_REPORT_${suffix}`,
        name: 'Complaint Report',
      },
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: 'report.complaints.view' },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    await prisma.userRole.create({ data: { userId: userAId, roleId: role.id } });

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['report.complaints.view']);
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
