import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  FeePaymentMethod,
  FeeStructureStatus,
  StudentFeeStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeeStructuresService } from './fee-structures.service';
import { PaymentReceiptPdfService } from './services/payment-receipt-pdf.service';
import { StudentFeesService } from './student-fees.service';

describe('StudentFeesService', () => {
  const actor = {
    userId: 'user-1',
    organizationId: 'org-1',
    sessionId: 'session-1',
    email: 'admin@example.com',
  };

  const studentFeeRecord = {
    id: 'student-fee-1',
    organizationId: 'org-1',
    studentId: 'student-1',
    feeStructureId: 'structure-1',
    amount: new Decimal(1000),
    dueDate: null,
    status: StudentFeeStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    student: {
      id: 'student-1',
      studentCode: 'STU-001',
      firstName: 'Asha',
      lastName: 'Patel',
      displayName: null,
      className: null,
      studentClass: null,
      section: null,
    },
    feeStructure: {
      id: 'structure-1',
      name: 'Annual Tuition',
    },
    payments: [] as Array<{
      id: string;
      organizationId: string;
      studentFeeId: string;
      amount: Decimal;
      paymentDate: Date;
      paymentMethod: FeePaymentMethod;
      reference: string | null;
      notes: string | null;
      createdByUserId: string;
      createdAt: Date;
    }>,
  };

  let prisma: PrismaService;
  let feeStructuresService: jest.Mocked<Pick<FeeStructuresService, 'assertActiveFeeStructure'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let service: StudentFeesService;

  beforeEach(() => {
    prisma = {
      student: {
        findFirst: jest.fn().mockResolvedValue({ id: 'student-1', organizationId: 'org-1' }),
      },
      studentFee: {
        create: jest.fn().mockResolvedValue(studentFeeRecord),
        findFirst: jest.fn().mockResolvedValue(studentFeeRecord),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
        update: jest.fn(),
      },
      feePayment: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn(),
    } as unknown as PrismaService;

    feeStructuresService = {
      assertActiveFeeStructure: jest.fn().mockResolvedValue({
        id: 'structure-1',
        amount: new Decimal(1000),
        status: FeeStructureStatus.ACTIVE,
      }),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    service = new StudentFeesService(
      prisma,
      feeStructuresService as unknown as FeeStructuresService,
      auditService as unknown as AuditService,
      { generate: jest.fn() } as unknown as PaymentReceiptPdfService,
    );
  });

  it('rejects zero payment amounts', async () => {
    await expect(
      service.recordPayment(actor as never, 'student-fee-1', {
        amount: 0,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects negative payment amounts', async () => {
    await expect(
      service.recordPayment(actor as never, 'student-fee-1', {
        amount: -10,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects payment greater than outstanding amount', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'student-fee-1' }]),
        studentFee: {
          findFirstOrThrow: jest.fn().mockResolvedValue(studentFeeRecord),
          update: jest.fn(),
        },
        feePayment: { create: jest.fn() },
      }),
    );

    await expect(
      service.recordPayment(actor as never, 'student-fee-1', {
        amount: 1500,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects payment against a fully paid fee', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'student-fee-1' }]),
        studentFee: {
          findFirstOrThrow: jest.fn().mockResolvedValue({
            ...studentFeeRecord,
            status: StudentFeeStatus.PAID,
            payments: [
              {
                id: 'payment-1',
                organizationId: 'org-1',
                studentFeeId: 'student-fee-1',
                amount: new Decimal(1000),
                paymentDate: new Date('2026-04-01T00:00:00.000Z'),
                paymentMethod: FeePaymentMethod.CASH,
                reference: null,
                notes: null,
                createdByUserId: 'user-1',
                createdAt: new Date('2026-04-01T00:00:00.000Z'),
              },
            ],
          }),
          update: jest.fn(),
        },
        feePayment: { create: jest.fn() },
      }),
    );

    await expect(
      service.recordPayment(actor as never, 'student-fee-1', {
        amount: 100,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found for cross-tenant student fee access', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        $queryRaw: jest.fn().mockResolvedValue([]),
        studentFee: {
          findFirstOrThrow: jest.fn(),
          update: jest.fn(),
        },
        feePayment: { create: jest.fn() },
      }),
    );

    await expect(
      service.recordPayment(actor as never, 'student-fee-foreign', {
        amount: 100,
        paymentDate: '2026-05-01',
        paymentMethod: FeePaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records partial payment and updates status atomically', async () => {
    const updatedRecord = {
      ...studentFeeRecord,
      status: StudentFeeStatus.PARTIALLY_PAID,
      payments: [
        {
          id: 'payment-1',
          organizationId: 'org-1',
          studentFeeId: 'student-fee-1',
          amount: new Decimal(400),
          paymentDate: new Date('2026-05-01T00:00:00.000Z'),
          paymentMethod: FeePaymentMethod.UPI,
          reference: 'UPI-123',
          notes: null,
          createdByUserId: 'user-1',
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
        },
      ],
    };

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'student-fee-1' }]),
      studentFee: {
        findFirstOrThrow: jest.fn().mockResolvedValue(studentFeeRecord),
        update: jest.fn().mockResolvedValue(updatedRecord),
      },
      feePayment: {
        create: jest.fn().mockResolvedValue(updatedRecord.payments[0]),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));

    const result = await service.recordPayment(actor as never, 'student-fee-1', {
      amount: 400,
      paymentDate: '2026-05-01',
      paymentMethod: FeePaymentMethod.UPI,
      reference: 'UPI-123',
    });

    expect(tx.feePayment.create).toHaveBeenCalled();
    expect(tx.studentFee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: StudentFeeStatus.PARTIALLY_PAID },
      }),
    );
    expect(result.studentFee.status).toBe(StudentFeeStatus.PARTIALLY_PAID);
    expect(result.studentFee.paidAmount).toBe(400);
    expect(result.studentFee.outstandingAmount).toBe(600);
    expect(auditService.record).toHaveBeenCalled();
  });
});
