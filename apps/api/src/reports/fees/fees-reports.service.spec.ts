import { BadRequestException } from '@nestjs/common';
import { FeePaymentMethod, StudentFeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { FeeReportDateScope } from './constants/fee-report.constants';
import { FeesReportsService } from './fees-reports.service';

describe('FeesReportsService', () => {
  const prisma = {
    organization: { findUnique: jest.fn() },
    organizationSettings: { findUnique: jest.fn() },
    studentFee: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const service = new FeesReportsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ code: 'demo-school' });
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.studentFee.count.mockResolvedValue(0);
    prisma.studentFee.findMany.mockResolvedValue([]);
  });

  it('does not apply date filtering when no dates are provided', () => {
    const context = service.resolveDateContext({ page: 1, pageSize: 25 }, 'UTC');
    expect(context.dateFilterApplied).toBe(false);
    expect(context.fromDate).toBeNull();
  });

  it('rejects invalid date ranges', () => {
    expect(() =>
      service.resolveDateContext(
        { page: 1, pageSize: 25, startDate: '2026-09-30', endDate: '2026-09-01' },
        'UTC',
      ),
    ).toThrow(BadRequestException);
  });

  it('aggregates summary amounts from student fees and payments', async () => {
    prisma.studentFee.count.mockResolvedValue(2);
    prisma.studentFee.findMany.mockResolvedValue([
      {
        id: 'fee-1',
        organizationId: 'org-1',
        studentId: 'student-1',
        feeStructureId: 'structure-1',
        amount: new Decimal(1000),
        dueDate: null,
        status: StudentFeeStatus.PARTIALLY_PAID,
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
        updatedAt: new Date('2026-09-10T10:00:00.000Z'),
        student: {
          id: 'student-1',
          studentCode: 'S001',
          firstName: 'Ada',
          lastName: 'Lovelace',
          displayName: null,
        },
        feeStructure: { id: 'structure-1', name: 'Tuition' },
        payments: [
          {
            id: 'pay-1',
            organizationId: 'org-1',
            studentFeeId: 'fee-1',
            amount: new Decimal(400),
            paymentDate: new Date('2026-09-15T00:00:00.000Z'),
            paymentMethod: FeePaymentMethod.CASH,
            reference: null,
            notes: null,
            createdByUserId: 'user-1',
            createdAt: new Date('2026-09-15T10:00:00.000Z'),
          },
        ],
      },
      {
        id: 'fee-2',
        organizationId: 'org-1',
        studentId: 'student-2',
        feeStructureId: 'structure-1',
        amount: new Decimal(500),
        dueDate: null,
        status: StudentFeeStatus.PAID,
        createdAt: new Date('2026-09-12T10:00:00.000Z'),
        updatedAt: new Date('2026-09-12T10:00:00.000Z'),
        student: {
          id: 'student-2',
          studentCode: 'S002',
          firstName: 'Grace',
          lastName: 'Hopper',
          displayName: null,
        },
        feeStructure: { id: 'structure-1', name: 'Tuition' },
        payments: [
          {
            id: 'pay-2',
            organizationId: 'org-1',
            studentFeeId: 'fee-2',
            amount: new Decimal(500),
            paymentDate: new Date('2026-09-20T00:00:00.000Z'),
            paymentMethod: FeePaymentMethod.UPI,
            reference: null,
            notes: null,
            createdByUserId: 'user-1',
            createdAt: new Date('2026-09-20T10:00:00.000Z'),
          },
        ],
      },
    ]);

    const report = await service.generate('org-1', {
      page: 1,
      pageSize: 25,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      dateScope: FeeReportDateScope.ASSIGNED,
    });

    expect(report.summary.totalAssigned).toBe(1500);
    expect(report.summary.totalCollected).toBe(900);
    expect(report.summary.totalOutstanding).toBe(600);
    expect(report.summary.partiallyPaidFeeCount).toBe(1);
    expect(report.summary.paidFeeCount).toBe(1);
    expect(report.breakdown.byPaymentMethod).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: FeePaymentMethod.CASH, collectedAmount: 400 }),
        expect.objectContaining({ method: FeePaymentMethod.UPI, collectedAmount: 500 }),
      ]),
    );
  });
});
