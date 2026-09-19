import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FeePaymentMethod,
  FeeStructureStatus,
  PrismaClient,
  StudentFeeStatus,
  StudentStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { FeeStructuresService } from './fee-structures.service';
import { StudentFeesService } from './student-fees.service';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Fees integration', () => {
  let prisma: PrismaClient;
  let feeStructuresService: FeeStructuresService;
  let studentFeesService: StudentFeesService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let orgAId: string;
  let orgBId: string;
  let actorAId: string;
  let studentAId: string;

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
      data: { name: 'Fees School A', code: `fees-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Fees School B', code: `fees-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const actorA = await prisma.user.create({
      data: { organizationId: orgAId, email: `fees-admin-a-${Date.now()}@example.com` },
    });
    actorAId = actorA.id;

    const studentA = await prisma.student.create({
      data: {
        organizationId: orgAId,
        studentCode: `fees-student-a-${Date.now()}`,
        firstName: 'Fees',
        lastName: 'StudentA',
        status: StudentStatus.ACTIVE,
      },
    });
    studentAId = studentA.id;

    const auditService = new AuditService(prisma as unknown as PrismaService);
    feeStructuresService = new FeeStructuresService(
      prisma as unknown as PrismaService,
      auditService,
    );
    studentFeesService = new StudentFeesService(
      prisma as unknown as PrismaService,
      feeStructuresService,
      auditService,
    );
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a fee structure for the authenticated organization', async () => {
    const feeStructure = await feeStructuresService.create(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        name: 'Annual Tuition',
        amount: 50000,
        periodStart: '2026-04-01',
        periodEnd: '2027-03-31',
      },
    );

    expect(feeStructure.organizationId).toBe(orgAId);
    expect(feeStructure.status).toBe(FeeStructureStatus.ACTIVE);
  });

  it('prevents cross-tenant fee structure access', async () => {
    const feeStructure = await feeStructuresService.create(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        name: 'Transport Fee',
        amount: 12000,
        periodStart: '2026-04-01',
        periodEnd: '2027-03-31',
      },
    );

    await expect(
      feeStructuresService.findById(orgBId, feeStructure.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns a student fee and records payment lifecycle transitions', async () => {
    const feeStructure = await feeStructuresService.create(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        name: 'Exam Fee',
        amount: 1000,
        periodStart: '2026-04-01',
        periodEnd: '2027-03-31',
      },
    );

    const studentFee = await studentFeesService.assign(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        studentId: studentAId,
        feeStructureId: feeStructure.id,
      },
    );

    expect(studentFee.status).toBe(StudentFeeStatus.PENDING);

    const partial = await studentFeesService.recordPayment(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      studentFee.id,
      {
        amount: 400,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      },
    );

    expect(partial.studentFee.status).toBe(StudentFeeStatus.PARTIALLY_PAID);
    expect(partial.studentFee.outstandingAmount).toBe(600);

    const full = await studentFeesService.recordPayment(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      studentFee.id,
      {
        amount: 600,
        paymentDate: '2026-05-10',
        paymentMethod: FeePaymentMethod.BANK_TRANSFER,
      },
    );

    expect(full.studentFee.status).toBe(StudentFeeStatus.PAID);
    expect(full.studentFee.outstandingAmount).toBe(0);

    const summary = await studentFeesService.getStudentSummary(orgAId, studentAId);
    expect(summary.totalAssigned).toBe(1000);
    expect(summary.totalPaid).toBe(1000);
    expect(summary.totalOutstanding).toBe(0);
  });

  it('prevents cross-tenant student fee assignment lookup', async () => {
    const feeStructure = await feeStructuresService.create(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        name: 'Library Fee',
        amount: 500,
        periodStart: '2026-04-01',
        periodEnd: '2027-03-31',
      },
    );

    const studentFee = await studentFeesService.assign(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        studentId: studentAId,
        feeStructureId: feeStructure.id,
      },
    );

    await expect(
      studentFeesService.findById(orgBId, studentFee.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks payment IDOR across tenants', async () => {
    const feeStructure = await feeStructuresService.create(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        name: 'Lab Fee',
        amount: 800,
        periodStart: '2026-04-01',
        periodEnd: '2027-03-31',
      },
    );

    const studentFee = await studentFeesService.assign(
      {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
      {
        studentId: studentAId,
        feeStructureId: feeStructure.id,
      },
    );

    await expect(
      studentFeesService.recordPayment(
        {
          userId: actorAId,
          organizationId: orgBId,
          sessionId: 'session-b',
          email: 'other@example.com',
        },
        studentFee.id,
        {
          amount: 100,
          paymentDate: '2026-05-01',
          paymentMethod: FeePaymentMethod.CASH,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('enforces fee permissions on the backend', async () => {
    const request = {
      user: {
        userId: actorAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'admin@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['fee.record_payment']);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
