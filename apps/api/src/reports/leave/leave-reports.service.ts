import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRequestStatus, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { getLocalDateString } from '../../dashboard/utils/dashboard-date.util';
import { isValidTimezone } from '../../onboarding/utils/timezone.util';
import {
  calculateAvailableBalance,
  decimalToNumber,
  formatLeaveDate,
  parseLeaveDate,
} from '../../leave/utils/leave.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { LEAVE_REPORT_ERROR_CODES } from './constants/leave-report.constants';
import { buildCsv } from '../common/csv-export.util';
import { MAX_REPORT_CSV_EXPORT_ROWS } from '../common/max-export-rows';
import { LeaveReportQueryDto } from './dto/leave-report-query.dto';

const recordSelect = {
  id: true,
  staffId: true,
  leaveTypeId: true,
  startDate: true,
  endDate: true,
  duration: true,
  status: true,
  approvalRequestId: true,
  submittedAt: true,
  decidedAt: true,
  staff: {
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      displayName: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
  leaveType: { select: { id: true, name: true, code: true } },
  approvalRequest: { select: { id: true, status: true } },
} as const;

type LeaveReportRecord = Prisma.LeaveRequestGetPayload<{ select: typeof recordSelect }>;

@Injectable()
export class LeaveReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: LeaveReportQueryDto) {
    await this.assertSchoolOrganization(organizationId);
    const timezone = await this.getOrganizationTimezone(organizationId);
    const dateContext = this.resolveDateContext(query, timezone);
    const where = this.buildWhere(organizationId, dateContext, query);

    const [records, total, statusGroups, approvedAggregate, onLeaveStaff] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        select: recordSelect,
        orderBy: [{ startDate: 'desc' }, { submittedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.leaveRequest.count({ where }),
      this.prisma.leaveRequest.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.leaveRequest.aggregate({
        where: { ...where, status: LeaveRequestStatus.APPROVED },
        _sum: { duration: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: { ...where, status: LeaveRequestStatus.APPROVED },
        select: { staffId: true },
        distinct: ['staffId'],
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ) as Record<string, number>;

    const byDepartment = await this.buildDepartmentBreakdown(
      organizationId,
      dateContext,
      query,
    );

    const balances = query.staffId
      ? await this.loadBalancesForStaff(organizationId, query.staffId, query.leaveTypeId)
      : null;

    return {
      data: records.map((record) => this.toRecordDto(record)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary: {
        fromDate: dateContext.fromDate,
        toDate: dateContext.toDate,
        timezone,
        dateFilterApplied: dateContext.dateFilterApplied,
        totalRequests: total,
        pending: statusCounts[LeaveRequestStatus.PENDING_APPROVAL] ?? 0,
        approved: statusCounts[LeaveRequestStatus.APPROVED] ?? 0,
        rejected: statusCounts[LeaveRequestStatus.REJECTED] ?? 0,
        employeesOnLeave: onLeaveStaff.length,
        leaveDaysApproved: decimalToNumber(approvedAggregate._sum.duration ?? 0),
      },
      breakdown: { byDepartment },
      balances,
    };
  }

  resolveDateContext(
    query: LeaveReportQueryDto,
    timezone: string,
  ): {
    fromDate: string | null;
    toDate: string | null;
    dateFilterApplied: boolean;
    periodStart?: Date;
    periodEnd?: Date;
  } {
    if (query.date && (query.startDate || query.endDate)) {
      throw new BadRequestException({
        code: LEAVE_REPORT_ERROR_CODES.CONFLICTING_DATE_PARAMS,
        message: 'Use either date or startDate/endDate, not both',
      });
    }

    if (!query.date && !query.startDate && !query.endDate) {
      if (query.status) {
        return { fromDate: null, toDate: null, dateFilterApplied: false };
      }

      const today = getLocalDateString(timezone);
      return {
        fromDate: today,
        toDate: today,
        dateFilterApplied: true,
        periodStart: parseLeaveDate(today),
        periodEnd: parseLeaveDate(today),
      };
    }

    const fromDate = query.date ?? query.startDate ?? query.endDate!;
    const toDate = query.date ?? query.endDate ?? query.startDate!;

    parseLeaveDate(fromDate);
    parseLeaveDate(toDate);

    if (toDate < fromDate) {
      throw new BadRequestException({
        code: LEAVE_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'endDate cannot be earlier than startDate',
      });
    }

    return {
      fromDate,
      toDate,
      dateFilterApplied: true,
      periodStart: parseLeaveDate(fromDate),
      periodEnd: parseLeaveDate(toDate),
    };
  }

  private buildWhere(
    organizationId: string,
    dateContext: ReturnType<LeaveReportsService['resolveDateContext']>,
    query: LeaveReportQueryDto,
  ): Prisma.LeaveRequestWhereInput {
    const where: Prisma.LeaveRequestWhereInput = {
      organizationId,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { staff: { departmentId: query.departmentId } } : {}),
    };

    if (dateContext.dateFilterApplied && dateContext.periodStart && dateContext.periodEnd) {
      where.startDate = { lte: dateContext.periodEnd };
      where.endDate = { gte: dateContext.periodStart };
    }

    return where;
  }

  private async assertSchoolOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: LEAVE_REPORT_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: LEAVE_REPORT_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use school leave reports',
      });
    }
  }

  private async getOrganizationTimezone(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { timezone: true },
    });
    const timezone = settings?.timezone ?? 'UTC';
    if (!isValidTimezone(timezone)) {
      throw new BadRequestException({
        code: LEAVE_REPORT_ERROR_CODES.INVALID_TIMEZONE,
        message: 'Organization timezone is not valid. Update it in institution setup.',
      });
    }
    return timezone;
  }

  private async buildDepartmentBreakdown(
    organizationId: string,
    dateContext: ReturnType<LeaveReportsService['resolveDateContext']>,
    query: LeaveReportQueryDto,
  ) {
    const departments = await this.prisma.department.findMany({
      where: {
        organizationId,
        ...(query.departmentId ? { id: query.departmentId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const segments: Array<{ departmentId: string | null; departmentName: string }> = [
      ...departments.map((department) => ({
        departmentId: department.id,
        departmentName: department.name,
      })),
      ...(query.departmentId ? [] : [{ departmentId: null, departmentName: 'Unassigned' }]),
    ];

    const breakdown = await Promise.all(
      segments.map(async (segment) => {
        const segmentQuery: LeaveReportQueryDto = {
          ...query,
          page: 1,
          pageSize: 25,
          departmentId: segment.departmentId ?? query.departmentId,
        };
        const where = this.buildWhere(organizationId, dateContext, {
          ...segmentQuery,
          departmentId: segment.departmentId ?? undefined,
        });
        if (segment.departmentId === null) {
          where.staff = { departmentId: { equals: null } };
        }

        const [total, pending, approved, rejected, daysAggregate] = await Promise.all([
          this.prisma.leaveRequest.count({ where }),
          this.prisma.leaveRequest.count({
            where: { ...where, status: LeaveRequestStatus.PENDING_APPROVAL },
          }),
          this.prisma.leaveRequest.count({
            where: { ...where, status: LeaveRequestStatus.APPROVED },
          }),
          this.prisma.leaveRequest.count({
            where: { ...where, status: LeaveRequestStatus.REJECTED },
          }),
          this.prisma.leaveRequest.aggregate({
            where: { ...where, status: LeaveRequestStatus.APPROVED },
            _sum: { duration: true },
          }),
        ]);

        return {
          departmentId: segment.departmentId,
          departmentName: segment.departmentName,
          total,
          pending,
          approved,
          rejected,
          leaveDays: decimalToNumber(daysAggregate._sum.duration ?? 0),
        };
      }),
    );

    return breakdown.filter((row) => row.total > 0);
  }

  private async loadBalancesForStaff(
    organizationId: string,
    staffId: string,
    leaveTypeId?: string,
  ) {
    const balances = await this.prisma.leaveBalance.findMany({
      where: {
        organizationId,
        staffId,
        ...(leaveTypeId ? { leaveTypeId } : {}),
      },
      orderBy: [{ periodStart: 'desc' }, { leaveTypeId: 'asc' }],
      take: 50,
    });

    return balances.map((balance) => ({
      id: balance.id,
      staffId: balance.staffId,
      leaveTypeId: balance.leaveTypeId,
      periodStart: formatLeaveDate(balance.periodStart),
      periodEnd: formatLeaveDate(balance.periodEnd),
      allocatedAmount:
        decimalToNumber(balance.openingBalance) +
        decimalToNumber(balance.allocatedAmount) +
        decimalToNumber(balance.adjustmentAmount),
      usedAmount: decimalToNumber(balance.usedAmount),
      pendingAmount: decimalToNumber(balance.pendingAmount),
      availableAmount: calculateAvailableBalance(balance),
    }));
  }

  private toRecordDto(record: LeaveReportRecord) {
    const staffName =
      record.staff.displayName?.trim() ||
      `${record.staff.firstName} ${record.staff.lastName}`.trim();

    return {
      id: record.id,
      staffId: record.staffId,
      staffName,
      employeeCode: record.staff.employeeCode,
      departmentId: record.staff.departmentId,
      departmentName: record.staff.department?.name ?? null,
      leaveTypeId: record.leaveTypeId,
      leaveTypeName: record.leaveType.name,
      startDate: formatLeaveDate(record.startDate),
      endDate: formatLeaveDate(record.endDate),
      duration: decimalToNumber(record.duration),
      status: record.status,
      approvalRequestId: record.approvalRequestId,
      approvalStatus: record.approvalRequest?.status ?? null,
      submittedAt: record.submittedAt.toISOString(),
      decidedAt: record.decidedAt?.toISOString() ?? null,
    };
  }

  async exportCsv(organizationId: string, query: LeaveReportQueryDto): Promise<string> {
    const report = await this.generate(organizationId, {
      ...query,
      page: 1,
      pageSize: MAX_REPORT_CSV_EXPORT_ROWS,
    });
    return buildCsv(
      [
        'Employee code',
        'Staff name',
        'Department',
        'Leave type',
        'Start',
        'End',
        'Duration',
        'Status',
        'Submitted at',
      ],
      report.data.map((row) => [
        row.employeeCode,
        row.staffName,
        row.departmentName,
        row.leaveTypeName,
        row.startDate,
        row.endDate,
        row.duration,
        row.status,
        row.submittedAt,
      ]),
    );
  }
}
