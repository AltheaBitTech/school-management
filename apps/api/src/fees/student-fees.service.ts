import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FeePayment,
  FeePaymentMethod,
  Prisma,
  Student,
  StudentFee,
  StudentFeeStatus,
  StudentStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FEE_ERROR_CODES } from './constants/fee.constants';
import { CreateStudentFeeDto } from './dto/create-student-fee.dto';
import { ListStudentFeesQueryDto } from './dto/list-student-fees-query.dto';
import { RecordFeePaymentDto } from './dto/record-fee-payment.dto';
import { FeeStructuresService } from './fee-structures.service';
import {
  calculateOutstanding,
  decimalToNumber,
  deriveStudentFeeStatus,
  sumPaymentAmounts,
  toFeeDecimal,
} from './utils/fee-amount.util';
import {
  formatFeeDate,
  parseFeeDate,
  parseOptionalFeeDate,
} from './utils/fee-date.util';

type StudentFeeWithRelations = StudentFee & {
  student: Pick<Student, 'id' | 'studentCode' | 'firstName' | 'lastName' | 'displayName'>;
  feeStructure: { id: string; name: string };
  payments: FeePayment[];
};

const studentFeeListInclude = {
  student: {
    select: {
      id: true,
      studentCode: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  },
  feeStructure: {
    select: {
      id: true,
      name: true,
    },
  },
  payments: {
    orderBy: { paymentDate: 'desc' as const },
  },
} satisfies Prisma.StudentFeeInclude;

@Injectable()
export class StudentFeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feeStructuresService: FeeStructuresService,
    private readonly auditService: AuditService,
  ) {}

  async assign(
    actor: AuthenticatedUser,
    dto: CreateStudentFeeDto,
    options?: { requestId?: string },
  ): Promise<StudentFeeWithRelations> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: dto.studentId,
        organizationId: actor.organizationId,
        status: StudentStatus.ACTIVE,
      },
    });

    if (!student) {
      throw new NotFoundException({
        code: FEE_ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student not found',
      });
    }

    const feeStructure = await this.feeStructuresService.assertActiveFeeStructure(
      actor.organizationId,
      dto.feeStructureId,
    );

    const assignedAmount = dto.amount !== undefined
      ? toFeeDecimal(dto.amount)
      : feeStructure.amount;
    const dueDate = parseOptionalFeeDate(dto.dueDate, 'Due date');

    const studentFee = await this.prisma.studentFee.create({
      data: {
        organizationId: actor.organizationId,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        amount: assignedAmount,
        dueDate,
        status: StudentFeeStatus.PENDING,
      },
      include: studentFeeListInclude,
    });

    await this.auditService.record({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: AUDIT_ACTIONS.STUDENT_FEE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.STUDENT_FEE,
      entityId: studentFee.id,
      requestId: options?.requestId,
      after: {
        studentId: studentFee.studentId,
        feeStructureId: studentFee.feeStructureId,
        assignedAmount: decimalToNumber(studentFee.amount),
        dueDate: studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : null,
      },
    });

    return studentFee;
  }

  async list(organizationId: string, query: ListStudentFeesQueryDto) {
    const where: Prisma.StudentFeeWhereInput = {
      organizationId,
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.feeStructureId ? { feeStructureId: query.feeStructureId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.studentFee.findMany({
        where,
        include: studentFeeListInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.studentFee.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toListDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, studentFeeId: string): Promise<StudentFeeWithRelations> {
    const studentFee = await this.prisma.studentFee.findFirst({
      where: { id: studentFeeId, organizationId },
      include: studentFeeListInclude,
    });

    if (!studentFee) {
      throw new NotFoundException({
        code: FEE_ERROR_CODES.STUDENT_FEE_NOT_FOUND,
        message: 'Student fee not found',
      });
    }

    return studentFee;
  }

  async getStudentSummary(organizationId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId },
    });

    if (!student) {
      throw new NotFoundException({
        code: FEE_ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student not found',
      });
    }

    const studentFees = await this.prisma.studentFee.findMany({
      where: { organizationId, studentId },
      include: {
        feeStructure: { select: { id: true, name: true } },
        payments: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    let totalAssigned = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const fees = studentFees.map((studentFee) => {
      const paidAmount = sumPaymentAmounts(studentFee.payments);
      const outstandingAmount = calculateOutstanding(studentFee.amount, paidAmount);
      const assignedAmount = decimalToNumber(studentFee.amount);
      const paid = decimalToNumber(paidAmount);
      const outstanding = decimalToNumber(outstandingAmount);

      totalAssigned += assignedAmount;
      totalPaid += paid;
      totalOutstanding += outstanding;

      return {
        id: studentFee.id,
        feeStructureName: studentFee.feeStructure.name,
        assignedAmount,
        paidAmount: paid,
        outstandingAmount: outstanding,
        status: deriveStudentFeeStatus(studentFee.amount, paidAmount),
        dueDate: studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : null,
      };
    });

    return {
      studentId: student.id,
      totalAssigned,
      totalPaid,
      totalOutstanding,
      fees,
    };
  }

  async recordPayment(
    actor: AuthenticatedUser,
    studentFeeId: string,
    dto: RecordFeePaymentDto,
    options?: { requestId?: string },
  ) {
    const paymentAmount = toFeeDecimal(dto.amount);
    const paymentDate = parseFeeDate(dto.paymentDate, 'Payment date');

    return this.prisma.$transaction(async (tx) => {
      const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "StudentFee"
        WHERE id = ${studentFeeId}::uuid
          AND "organizationId" = ${actor.organizationId}::uuid
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        throw new NotFoundException({
          code: FEE_ERROR_CODES.STUDENT_FEE_NOT_FOUND,
          message: 'Student fee not found',
        });
      }

      const studentFee = await tx.studentFee.findFirstOrThrow({
        where: { id: studentFeeId, organizationId: actor.organizationId },
        include: studentFeeListInclude,
      });

      if (studentFee.status === StudentFeeStatus.PAID) {
        throw new ConflictException({
          code: FEE_ERROR_CODES.STUDENT_FEE_ALREADY_PAID,
          message: 'This student fee is already fully paid',
        });
      }

      const totalPaid = sumPaymentAmounts(studentFee.payments);
      const outstanding = calculateOutstanding(studentFee.amount, totalPaid);

      if (paymentAmount.gt(outstanding)) {
        throw new BadRequestException({
          code: FEE_ERROR_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
          message: 'Payment amount exceeds the outstanding balance',
        });
      }

      const payment = await tx.feePayment.create({
        data: {
          organizationId: actor.organizationId,
          studentFeeId: studentFee.id,
          amount: paymentAmount,
          paymentDate,
          paymentMethod: dto.paymentMethod as FeePaymentMethod,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdByUserId: actor.userId,
        },
      });

      const updatedTotalPaid = totalPaid.add(paymentAmount);
      const nextStatus = deriveStudentFeeStatus(studentFee.amount, updatedTotalPaid);

      const updatedStudentFee = await tx.studentFee.update({
        where: { id: studentFee.id },
        data: { status: nextStatus },
        include: studentFeeListInclude,
      });

      await this.auditService.record(
        {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: AUDIT_ACTIONS.FEE_PAYMENT_RECORDED,
          entityType: AUDIT_ENTITY_TYPES.FEE_PAYMENT,
          entityId: payment.id,
          requestId: options?.requestId,
          after: {
            studentFeeId: studentFee.id,
            amount: decimalToNumber(payment.amount),
            paymentDate: formatFeeDate(payment.paymentDate),
            paymentMethod: payment.paymentMethod,
            nextStatus,
          },
        },
        tx,
      );

      return {
        payment: this.toPaymentDto(payment),
        studentFee: this.toDetailDto(updatedStudentFee),
      };
    });
  }

  toListDto(studentFee: StudentFeeWithRelations) {
    const paidAmount = sumPaymentAmounts(studentFee.payments);
    const outstandingAmount = calculateOutstanding(studentFee.amount, paidAmount);

    return {
      id: studentFee.id,
      studentId: studentFee.studentId,
      feeStructureId: studentFee.feeStructureId,
      assignedAmount: decimalToNumber(studentFee.amount),
      paidAmount: decimalToNumber(paidAmount),
      outstandingAmount: decimalToNumber(outstandingAmount),
      dueDate: studentFee.dueDate ? formatFeeDate(studentFee.dueDate) : null,
      status: deriveStudentFeeStatus(studentFee.amount, paidAmount),
      createdAt: studentFee.createdAt.toISOString(),
      updatedAt: studentFee.updatedAt.toISOString(),
      student: {
        id: studentFee.student.id,
        studentCode: studentFee.student.studentCode,
        firstName: studentFee.student.firstName,
        lastName: studentFee.student.lastName,
        displayName: studentFee.student.displayName,
      },
      feeStructure: {
        id: studentFee.feeStructure.id,
        name: studentFee.feeStructure.name,
      },
    };
  }

  toDetailDto(studentFee: StudentFeeWithRelations) {
    return {
      ...this.toListDto(studentFee),
      payments: studentFee.payments.map((payment) => this.toPaymentDto(payment)),
    };
  }

  toPaymentDto(payment: FeePayment) {
    return {
      id: payment.id,
      amount: decimalToNumber(payment.amount),
      paymentDate: formatFeeDate(payment.paymentDate),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      createdByUserId: payment.createdByUserId,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
