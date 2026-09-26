import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeePayment, FeePaymentMethod, Prisma, StudentFeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { getLocalDayUtcRange } from '../../dashboard/utils/dashboard-date.util';
import {
  calculateOutstanding,
  decimalToNumber,
  deriveStudentFeeStatus,
  sumPaymentAmounts,
} from '../../fees/utils/fee-amount.util';
import { formatFeeDate, parseFeeDate } from '../../fees/utils/fee-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { FEE_REPORT_ERROR_CODES, FeeReportDateScope } from './constants/fee-report.constants';
import { FeeReportQueryDto } from './dto/fee-report-query.dto';

const studentFeeInclude = {
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
    select: { id: true, name: true },
  },
  payments: {
    orderBy: { paymentDate: 'desc' as const },
  },
} satisfies Prisma.StudentFeeInclude;

type StudentFeeRow = Prisma.StudentFeeGetPayload<{ include: typeof studentFeeInclude }>;

@Injectable()
export class FeesReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: FeeReportQueryDto) {
    await this.assertSchoolOrganization(organizationId);
    const timezone = await this.getOrganizationTimezone(organizationId);
    const dateScope = query.dateScope ?? FeeReportDateScope.ASSIGNED;
    const dateContext = this.resolveDateContext(query, timezone);
    const where = this.buildWhere(organizationId, dateContext, dateScope, query);

    const [records, total, allMatching] = await Promise.all([
      this.prisma.studentFee.findMany({
        where,
        include: studentFeeInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.studentFee.count({ where }),
      this.prisma.studentFee.findMany({
        where,
        include: studentFeeInclude,
      }),
    ]);

    const summary = this.buildSummary(allMatching, dateContext, dateScope, timezone);
    const breakdown = this.buildBreakdown(allMatching, dateContext, dateScope, query.paymentMethod);

    return {
      data: records.map((record) => this.toRecordDto(record, dateContext, dateScope)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary,
      breakdown,
    };
  }

  private buildSummary(
    studentFees: StudentFeeRow[],
    dateContext: DateContext,
    dateScope: FeeReportDateScope,
    timezone: string,
  ) {
    let totalAssigned = new Decimal(0);
    let totalCollected = new Decimal(0);
    let totalOutstanding = new Decimal(0);
    let pendingAmount = new Decimal(0);
    let partiallyPaidAmount = new Decimal(0);
    let paidAmount = new Decimal(0);
    let pendingFeeCount = 0;
    let partiallyPaidFeeCount = 0;
    let paidFeeCount = 0;
    let totalPayments = 0;

    for (const studentFee of studentFees) {
      const assigned = studentFee.amount;
      const paymentsInScope = this.filterPayments(studentFee.payments, dateContext, dateScope);
      const paidAll = sumPaymentAmounts(studentFee.payments);
      const paidInScope =
        dateScope === FeeReportDateScope.COLLECTED && dateContext.dateFilterApplied
          ? sumPaymentAmounts(paymentsInScope)
          : paidAll;
      const outstanding = calculateOutstanding(assigned, paidAll);
      const status = deriveStudentFeeStatus(assigned, paidAll);

      totalAssigned = totalAssigned.add(assigned);
      totalCollected = totalCollected.add(paidInScope);
      totalOutstanding = totalOutstanding.add(outstanding);
      totalPayments += paymentsInScope.length;

      if (status === StudentFeeStatus.PENDING) {
        pendingFeeCount += 1;
        pendingAmount = pendingAmount.add(assigned);
      } else if (status === StudentFeeStatus.PARTIALLY_PAID) {
        partiallyPaidFeeCount += 1;
        partiallyPaidAmount = partiallyPaidAmount.add(outstanding);
      } else if (status === StudentFeeStatus.PAID) {
        paidFeeCount += 1;
        paidAmount = paidAmount.add(assigned);
      }
    }

    return {
      dateScope,
      fromDate: dateContext.fromDate,
      toDate: dateContext.toDate,
      timezone,
      dateFilterApplied: dateContext.dateFilterApplied,
      totalAssigned: decimalToNumber(totalAssigned),
      totalCollected: decimalToNumber(totalCollected),
      totalOutstanding: decimalToNumber(totalOutstanding),
      pendingAmount: decimalToNumber(pendingAmount),
      partiallyPaidAmount: decimalToNumber(partiallyPaidAmount),
      paidAmount: decimalToNumber(paidAmount),
      assignedFeeCount: studentFees.length,
      pendingFeeCount,
      partiallyPaidFeeCount,
      paidFeeCount,
      totalPayments,
    };
  }

  private buildBreakdown(
    studentFees: StudentFeeRow[],
    dateContext: DateContext,
    dateScope: FeeReportDateScope,
    paymentMethodFilter?: FeePaymentMethod,
  ) {
    const methodMap = new Map<
      FeePaymentMethod,
      { paymentCount: number; collectedAmount: Decimal }
    >();
    const structureMap = new Map<
      string,
      {
        feeStructureName: string;
        assignedAmount: Decimal;
        collectedAmount: Decimal;
        outstandingAmount: Decimal;
        feeCount: number;
      }
    >();
    const statusMap = new Map<
      StudentFeeStatus,
      { feeCount: number; assignedAmount: Decimal; outstandingAmount: Decimal }
    >();

    for (const studentFee of studentFees) {
      const assigned = studentFee.amount;
      const paidAll = sumPaymentAmounts(studentFee.payments);
      const outstanding = calculateOutstanding(assigned, paidAll);
      const status = deriveStudentFeeStatus(assigned, paidAll);
      const paymentsInScope = this.filterPayments(studentFee.payments, dateContext, dateScope);

      for (const payment of paymentsInScope) {
        if (paymentMethodFilter && payment.paymentMethod !== paymentMethodFilter) {
          continue;
        }
        const existing = methodMap.get(payment.paymentMethod) ?? {
          paymentCount: 0,
          collectedAmount: new Decimal(0),
        };
        existing.paymentCount += 1;
        existing.collectedAmount = existing.collectedAmount.add(payment.amount);
        methodMap.set(payment.paymentMethod, existing);
      }

      const structureKey = studentFee.feeStructureId;
      const structureRow = structureMap.get(structureKey) ?? {
        feeStructureName: studentFee.feeStructure.name,
        assignedAmount: new Decimal(0),
        collectedAmount: new Decimal(0),
        outstandingAmount: new Decimal(0),
        feeCount: 0,
      };
      structureRow.assignedAmount = structureRow.assignedAmount.add(assigned);
      structureRow.collectedAmount = structureRow.collectedAmount.add(
        dateScope === FeeReportDateScope.COLLECTED && dateContext.dateFilterApplied
          ? sumPaymentAmounts(paymentsInScope)
          : paidAll,
      );
      structureRow.outstandingAmount = structureRow.outstandingAmount.add(outstanding);
      structureRow.feeCount += 1;
      structureMap.set(structureKey, structureRow);

      const statusRow = statusMap.get(status) ?? {
        feeCount: 0,
        assignedAmount: new Decimal(0),
        outstandingAmount: new Decimal(0),
      };
      statusRow.feeCount += 1;
      statusRow.assignedAmount = statusRow.assignedAmount.add(assigned);
      statusRow.outstandingAmount = statusRow.outstandingAmount.add(outstanding);
      statusMap.set(status, statusRow);
    }

    return {
      byPaymentMethod: [...methodMap.entries()]
        .map(([method, row]) => ({
          method,
          paymentCount: row.paymentCount,
          collectedAmount: decimalToNumber(row.collectedAmount),
        }))
        .sort((a, b) => a.method.localeCompare(b.method)),
      byFeeStructure: [...structureMap.entries()]
        .map(([feeStructureId, row]) => ({
          feeStructureId,
          feeStructureName: row.feeStructureName,
          assignedAmount: decimalToNumber(row.assignedAmount),
          collectedAmount: decimalToNumber(row.collectedAmount),
          outstandingAmount: decimalToNumber(row.outstandingAmount),
          feeCount: row.feeCount,
        }))
        .sort((a, b) => a.feeStructureName.localeCompare(b.feeStructureName)),
      byStatus: [...statusMap.entries()]
        .map(([status, row]) => ({
          status,
          feeCount: row.feeCount,
          assignedAmount: decimalToNumber(row.assignedAmount),
          outstandingAmount: decimalToNumber(row.outstandingAmount),
        }))
        .sort((a, b) => a.status.localeCompare(b.status)),
    };
  }

  private toRecordDto(
    studentFee: StudentFeeRow,
    dateContext: DateContext,
    dateScope: FeeReportDateScope,
  ) {
    const paidAll = sumPaymentAmounts(studentFee.payments);
    const outstanding = calculateOutstanding(studentFee.amount, paidAll);
    const status = deriveStudentFeeStatus(studentFee.amount, paidAll);
    const latestPayment = studentFee.payments[0] ?? null;
    const paymentsInScope = this.filterPayments(studentFee.payments, dateContext, dateScope);
    const paidInScope =
      dateScope === FeeReportDateScope.COLLECTED && dateContext.dateFilterApplied
        ? sumPaymentAmounts(paymentsInScope)
        : paidAll;

    const studentName =
      studentFee.student.displayName?.trim() ||
      `${studentFee.student.firstName} ${studentFee.student.lastName}`.trim();

    return {
      id: studentFee.id,
      studentId: studentFee.studentId,
      studentName,
      studentCode: studentFee.student.studentCode,
      feeStructureId: studentFee.feeStructureId,
      feeStructureName: studentFee.feeStructure.name,
      assignedAmount: decimalToNumber(studentFee.amount),
      paidAmount: decimalToNumber(paidInScope),
      outstandingAmount: decimalToNumber(outstanding),
      status,
      assignedOn: studentFee.createdAt.toISOString().slice(0, 10),
      latestPaymentDate: latestPayment ? formatFeeDate(latestPayment.paymentDate) : null,
      latestPaymentMethod: latestPayment?.paymentMethod ?? null,
    };
  }

  private filterPayments(
    payments: FeePayment[],
    dateContext: DateContext,
    dateScope: FeeReportDateScope,
  ): FeePayment[] {
    if (dateScope !== FeeReportDateScope.COLLECTED || !dateContext.dateFilterApplied) {
      return payments;
    }

    return payments.filter((payment) => {
      const paymentDate = formatFeeDate(payment.paymentDate);
      if (dateContext.fromDate && paymentDate < dateContext.fromDate) {
        return false;
      }
      if (dateContext.toDate && paymentDate > dateContext.toDate) {
        return false;
      }
      return true;
    });
  }

  private buildWhere(
    organizationId: string,
    dateContext: DateContext,
    dateScope: FeeReportDateScope,
    query: FeeReportQueryDto,
  ): Prisma.StudentFeeWhereInput {
    const where: Prisma.StudentFeeWhereInput = {
      organizationId,
      ...(query.feeStructureId ? { feeStructureId: query.feeStructureId } : {}),
      ...(query.studentId ? { studentId: query.studentId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const paymentSome: Prisma.FeePaymentWhereInput = {};
    if (query.paymentMethod) {
      paymentSome.paymentMethod = query.paymentMethod;
    }

    if (dateScope === FeeReportDateScope.COLLECTED && dateContext.dateFilterApplied) {
      Object.assign(paymentSome, this.buildPaymentDateFilter(dateContext));
      where.payments = { some: paymentSome };
    } else if (query.paymentMethod) {
      where.payments = { some: paymentSome };
    }

    if (dateScope === FeeReportDateScope.ASSIGNED && dateContext.dateFilterApplied) {
      where.createdAt = {
        ...(dateContext.assignedStartUtc ? { gte: dateContext.assignedStartUtc } : {}),
        ...(dateContext.assignedEndUtc ? { lt: dateContext.assignedEndUtc } : {}),
      };
    }

    return where;
  }

  private buildPaymentDateFilter(dateContext: DateContext): Prisma.FeePaymentWhereInput {
    return {
      paymentDate: {
        ...(dateContext.paymentStartDate ? { gte: dateContext.paymentStartDate } : {}),
        ...(dateContext.paymentEndDate ? { lte: dateContext.paymentEndDate } : {}),
      },
    };
  }

  resolveDateContext(query: FeeReportQueryDto, timezone: string): DateContext {
    const fromDate = query.startDate ?? null;
    const toDate = query.endDate ?? null;

    if (fromDate && toDate && toDate < fromDate) {
      throw new BadRequestException({
        code: FEE_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'End date cannot be before start date',
      });
    }

    if (!fromDate && !toDate) {
      return {
        fromDate: null,
        toDate: null,
        dateFilterApplied: false,
      };
    }

    const effectiveFrom = fromDate ?? toDate!;
    const effectiveTo = toDate ?? fromDate!;
    const startRange = getLocalDayUtcRange(effectiveFrom, timezone);
    const endRange = getLocalDayUtcRange(effectiveTo, timezone);

    return {
      fromDate: effectiveFrom,
      toDate: effectiveTo,
      dateFilterApplied: true,
      assignedStartUtc: startRange.startUtc,
      assignedEndUtc: endRange.endUtc,
      paymentStartDate: parseFeeDate(effectiveFrom, 'Start date'),
      paymentEndDate: parseFeeDate(effectiveTo, 'End date'),
    };
  }

  private async assertSchoolOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: FEE_REPORT_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: FEE_REPORT_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use school fee reports',
      });
    }
  }

  private async getOrganizationTimezone(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { timezone: true },
    });
    return settings?.timezone ?? 'UTC';
  }
}

interface DateContext {
  fromDate: string | null;
  toDate: string | null;
  dateFilterApplied: boolean;
  assignedStartUtc?: Date;
  assignedEndUtc?: Date;
  paymentStartDate?: Date;
  paymentEndDate?: Date;
}
