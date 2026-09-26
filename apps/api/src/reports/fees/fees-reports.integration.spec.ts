import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FeePaymentMethod,
  PrismaClient,
  StudentFeeStatus,
  StudentStatus,
} from '@prisma/client';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PermissionsService } from '../../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../../permissions/constants/system-permissions';
import { toFeeDecimal } from '../../fees/utils/fee-amount.util';
import { parseFeeDate } from '../../fees/utils/fee-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { FeeReportDateScope } from './constants/fee-report.constants';
import { FeesReportsService } from './fees-reports.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Fees reports integration', () => {
  let prisma: PrismaClient;
  let reportsService: FeesReportsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let structureAId: string;
  let userAId: string;

  beforeAll(async () => {
    jest.setTimeout(120_000);
    prisma = new PrismaClient();
    await prisma.$connect();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    reportsService = new FeesReportsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(
      new Reflector(),
      new PermissionsService(prisma as unknown as PrismaService),
    );

    const suffix = Date.now();
    const orgA = await prisma.organization.create({
      data: { name: 'Fee Report A', code: `fee-report-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Fee Report B', code: `fee-report-b-${suffix}` },
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
      data: { organizationId: orgAId, email: `fee-report-admin-${suffix}@example.com` },
    });
    userAId = userA.id;

    const structureA = await prisma.feeStructure.create({
      data: {
        organizationId: orgAId,
        name: 'Tuition',
        amount: toFeeDecimal(1000),
        periodStart: parseFeeDate('2026-01-01', 'Period start'),
        periodEnd: parseFeeDate('2026-12-31', 'Period end'),
      },
    });
    structureAId = structureA.id;

    const studentA = await prisma.student.create({
      data: {
        organizationId: orgAId,
        studentCode: `fsa-${suffix}`,
        firstName: 'Fee',
        lastName: 'StudentA',
        status: StudentStatus.ACTIVE,
      },
    });
    const studentB = await prisma.student.create({
      data: {
        organizationId: orgBId,
        studentCode: `fsb-${suffix}`,
        firstName: 'Fee',
        lastName: 'StudentB',
        status: StudentStatus.ACTIVE,
      },
    });

    const feeA = await prisma.studentFee.create({
      data: {
        organizationId: orgAId,
        studentId: studentA.id,
        feeStructureId: structureAId,
        amount: toFeeDecimal(1000),
        status: StudentFeeStatus.PARTIALLY_PAID,
      },
    });

    await prisma.feePayment.create({
      data: {
        organizationId: orgAId,
        studentFeeId: feeA.id,
        amount: toFeeDecimal(400),
        paymentDate: parseFeeDate('2026-09-15', 'Payment date'),
        paymentMethod: FeePaymentMethod.CASH,
        createdByUserId: userAId,
      },
    });

    const structureB = await prisma.feeStructure.create({
      data: {
        organizationId: orgBId,
        name: 'Other Tuition',
        amount: toFeeDecimal(2000),
        periodStart: parseFeeDate('2026-01-01', 'Period start'),
        periodEnd: parseFeeDate('2026-12-31', 'Period end'),
      },
    });

    await prisma.studentFee.create({
      data: {
        organizationId: orgBId,
        studentId: studentB.id,
        feeStructureId: structureB.id,
        amount: toFeeDecimal(2000),
        status: StudentFeeStatus.PENDING,
      },
    });
  });

  afterAll(async () => {
    await prisma.feePayment.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.studentFee.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.feeStructure.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.student.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.userRole.deleteMany({ where: { user: { organizationId: { in: [orgAId, orgBId] } } } });
    await prisma.rolePermission.deleteMany({
      where: { role: { organizationId: { in: [orgAId, orgBId] } } },
    });
    await prisma.role.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organizationSettings.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
  });

  it('scopes fee report data to the organization', async () => {
    const reportA = await reportsService.generate(orgAId, { page: 1, pageSize: 25 });
    const reportB = await reportsService.generate(orgBId, { page: 1, pageSize: 25 });

    expect(reportA.summary.assignedFeeCount).toBe(1);
    expect(reportA.summary.totalAssigned).toBe(1000);
    expect(reportA.summary.totalOutstanding).toBe(600);
    expect(reportB.summary.assignedFeeCount).toBe(1);
    expect(reportB.summary.totalAssigned).toBe(2000);
    expect(reportB.summary.totalOutstanding).toBe(2000);
  });

  it('filters collected payments by payment date', async () => {
    const report = await reportsService.generate(orgAId, {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      dateScope: FeeReportDateScope.COLLECTED,
    });

    expect(report.summary.totalCollected).toBe(400);
    expect(report.summary.totalPayments).toBe(1);
    expect(report.breakdown.byPaymentMethod[0]?.method).toBe(FeePaymentMethod.CASH);
  });

  it('blocks platform organization fee reports', async () => {
    const platformOrg =
      (await prisma.organization.findUnique({ where: { code: PLATFORM_ORGANIZATION_CODE } })) ??
      (await prisma.organization.create({
        data: { name: 'CampusOps Platform', code: PLATFORM_ORGANIZATION_CODE },
      }));

    await expect(
      reportsService.generate(platformOrg.id, { page: 1, pageSize: 25 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows report.fees.view permission guard', async () => {
    const role = await prisma.role.create({
      data: { organizationId: orgAId, code: `FEE_REPORT_${Date.now()}`, name: 'Fee Report' },
    });
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { code: 'report.fees.view' },
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    await prisma.userRole.create({ data: { userId: userAId, roleId: role.id } });

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['report.fees.view']);
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
  });
});
