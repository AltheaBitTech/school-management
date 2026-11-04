import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VisitorStatus } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { getLocalDateString, getLocalDayUtcRange } from '../../dashboard/utils/dashboard-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { parseVisitorDate } from '../../visitors/utils/visitor-date.util';
import { VISITOR_REPORT_ERROR_CODES } from './constants/visitor-report.constants';
import { buildCsv } from '../common/csv-export.util';
import { MAX_REPORT_CSV_EXPORT_ROWS } from '../common/max-export-rows';
import { VisitorReportQueryDto } from './dto/visitor-report-query.dto';

const recordSelect = {
  id: true,
  visitorCode: true,
  name: true,
  mobile: true,
  purpose: true,
  checkInAt: true,
  checkOutAt: true,
  status: true,
  hostStaffId: true,
  hostStaff: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
} as const;

type VisitorReportRecord = Prisma.VisitorGetPayload<{ select: typeof recordSelect }>;

@Injectable()
export class VisitorsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: VisitorReportQueryDto) {
    await this.assertSchoolOrganization(organizationId);
    const timezone = await this.getOrganizationTimezone(organizationId);
    const dateContext = this.resolveDateContext(query, timezone);
    const where = this.buildWhere(organizationId, dateContext, query);

    const [records, total, statusGroups, purposeGroups, activeOnCampus] = await Promise.all([
      this.prisma.visitor.findMany({
        where,
        select: recordSelect,
        orderBy: [{ checkInAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.visitor.count({ where }),
      this.prisma.visitor.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.visitor.groupBy({
        by: ['purpose'],
        where,
        _count: { _all: true },
        orderBy: { _count: { purpose: 'desc' } },
      }),
      this.prisma.visitor.count({
        where: {
          organizationId,
          status: VisitorStatus.CHECKED_IN,
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ) as Partial<Record<VisitorStatus, number>>;

    const checkedInVisits = statusCounts[VisitorStatus.CHECKED_IN] ?? 0;
    const checkedOutVisits = statusCounts[VisitorStatus.CHECKED_OUT] ?? 0;

    const [byHost, byDepartment] = await Promise.all([
      this.buildHostBreakdown(organizationId, where, query.hostStaffId),
      this.buildDepartmentBreakdown(organizationId, where, query.departmentId),
    ]);

    return {
      data: records.map((record) => this.toRecordDto(record, timezone)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary: {
        fromDate: dateContext.fromDate,
        toDate: dateContext.toDate,
        timezone,
        dateFilterApplied: dateContext.dateFilterApplied,
        scope: dateContext.scope,
        totalVisits: total,
        checkedInVisits,
        checkedOutVisits,
        activeOnCampus,
        checkedInOnSelectedDay:
          dateContext.scope === 'single_day' && dateContext.dateFilterApplied ? total : null,
      },
      breakdown: {
        byStatus: statusGroups.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        byPurpose: purposeGroups.map((row) => ({
          purpose: row.purpose,
          count: row._count._all,
        })),
        byHost,
        byDepartment,
      },
    };
  }

  resolveDateContext(
    query: VisitorReportQueryDto,
    timezone: string,
  ): {
    fromDate: string | null;
    toDate: string | null;
    dateFilterApplied: boolean;
    scope: 'none' | 'single_day' | 'date_range';
    checkInStartUtc?: Date;
    checkInEndUtc?: Date;
  } {
    if (query.date && (query.startDate || query.endDate)) {
      throw new BadRequestException({
        code: VISITOR_REPORT_ERROR_CODES.CONFLICTING_DATE_PARAMS,
        message: 'Use either date or startDate/endDate, not both',
      });
    }

    if (query.date) {
      parseVisitorDate(query.date);
      const { startUtc, endUtc } = getLocalDayUtcRange(query.date, timezone);
      return {
        fromDate: query.date,
        toDate: query.date,
        dateFilterApplied: true,
        scope: 'single_day',
        checkInStartUtc: startUtc,
        checkInEndUtc: endUtc,
      };
    }

    const fromDate = query.startDate ?? null;
    const toDate = query.endDate ?? null;

    if (!fromDate && !toDate) {
      return {
        fromDate: null,
        toDate: null,
        dateFilterApplied: false,
        scope: 'none',
      };
    }

    if (fromDate && toDate && toDate < fromDate) {
      throw new BadRequestException({
        code: VISITOR_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'endDate cannot be earlier than startDate',
      });
    }

    const effectiveFrom = fromDate ?? toDate!;
    const effectiveTo = toDate ?? fromDate!;
    parseVisitorDate(effectiveFrom);
    parseVisitorDate(effectiveTo);

    const startRange = getLocalDayUtcRange(effectiveFrom, timezone);
    const endRange = getLocalDayUtcRange(effectiveTo, timezone);

    return {
      fromDate: effectiveFrom,
      toDate: effectiveTo,
      dateFilterApplied: true,
      scope: effectiveFrom === effectiveTo ? 'single_day' : 'date_range',
      checkInStartUtc: startRange.startUtc,
      checkInEndUtc: endRange.endUtc,
    };
  }

  buildWhere(
    organizationId: string,
    dateContext: ReturnType<VisitorsReportsService['resolveDateContext']>,
    query: VisitorReportQueryDto,
  ): Prisma.VisitorWhereInput {
    const purposeTerm = query.purpose?.trim();

    const where: Prisma.VisitorWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.hostStaffId ? { hostStaffId: query.hostStaffId } : {}),
      ...(query.departmentId
        ? {
            hostStaff: {
              organizationId,
              departmentId: query.departmentId,
            },
          }
        : {}),
      ...(purposeTerm
        ? { purpose: { contains: purposeTerm, mode: 'insensitive' } }
        : {}),
    };

    if (dateContext.dateFilterApplied && dateContext.checkInStartUtc && dateContext.checkInEndUtc) {
      where.checkInAt = {
        gte: dateContext.checkInStartUtc,
        lt: dateContext.checkInEndUtc,
      };
    }

    return where;
  }

  private async buildHostBreakdown(
    organizationId: string,
    where: Prisma.VisitorWhereInput,
    hostStaffIdFilter?: string,
  ) {
    const hostGroups = await this.prisma.visitor.groupBy({
      by: ['hostStaffId'],
      where: {
        ...where,
        ...(hostStaffIdFilter ? { hostStaffId: hostStaffIdFilter } : {}),
      },
      _count: { _all: true },
    });

    if (hostGroups.length === 0) {
      return [];
    }

    const staffIds = hostGroups.map((group) => group.hostStaffId);
    const staffMembers = await this.prisma.staff.findMany({
      where: { organizationId, id: { in: staffIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    });

    const staffNameById = new Map(
      staffMembers.map((staff) => [staff.id, formatStaffName(staff)]),
    );

    const rows = await Promise.all(
      hostGroups.map(async (group) => {
        const segmentWhere: Prisma.VisitorWhereInput = {
          ...where,
          hostStaffId: group.hostStaffId,
        };
        const [total, active] = await Promise.all([
          this.prisma.visitor.count({ where: segmentWhere }),
          this.prisma.visitor.count({
            where: { ...segmentWhere, status: VisitorStatus.CHECKED_IN },
          }),
        ]);

        return {
          staffId: group.hostStaffId,
          staffName: staffNameById.get(group.hostStaffId) ?? 'Unknown',
          total,
          active,
        };
      }),
    );

    return rows.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }

  private async buildDepartmentBreakdown(
    organizationId: string,
    where: Prisma.VisitorWhereInput,
    departmentIdFilter?: string,
  ) {
    const departments = await this.prisma.department.findMany({
      where: {
        organizationId,
        ...(departmentIdFilter ? { id: departmentIdFilter } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const segments: Array<{ departmentId: string | null; departmentName: string }> = [
      ...departments.map((department) => ({
        departmentId: department.id,
        departmentName: department.name,
      })),
      ...(departmentIdFilter
        ? []
        : [{ departmentId: null, departmentName: 'No department' }]),
    ];

    return Promise.all(
      segments.map(async (segment) => {
        const segmentWhere: Prisma.VisitorWhereInput = {
          ...where,
          ...(segment.departmentId
            ? {
                hostStaff: {
                  organizationId,
                  departmentId: segment.departmentId,
                },
              }
            : {
                hostStaff: { departmentId: null },
              }),
        };

        const [total, active] = await Promise.all([
          this.prisma.visitor.count({ where: segmentWhere }),
          this.prisma.visitor.count({
            where: { ...segmentWhere, status: VisitorStatus.CHECKED_IN },
          }),
        ]);

        return {
          departmentId: segment.departmentId,
          departmentName: segment.departmentName,
          total,
          active,
        };
      }),
    );
  }

  private toRecordDto(record: VisitorReportRecord, timezone: string) {
    const host = record.hostStaff;

    return {
      id: record.id,
      visitorCode: record.visitorCode,
      name: record.name,
      mobile: record.mobile,
      purpose: record.purpose,
      hostStaffId: record.hostStaffId,
      hostName: formatStaffName(host),
      departmentId: host.departmentId,
      departmentName: host.department?.name ?? null,
      checkInAt: record.checkInAt.toISOString(),
      checkOutAt: record.checkOutAt?.toISOString() ?? null,
      status: record.status,
      visitDate: getLocalDateString(timezone, record.checkInAt),
    };
  }

  async exportCsv(organizationId: string, query: VisitorReportQueryDto): Promise<string> {
    const report = await this.generate(organizationId, {
      ...query,
      page: 1,
      pageSize: MAX_REPORT_CSV_EXPORT_ROWS,
    });
    return buildCsv(
      [
        'Visitor code',
        'Name',
        'Mobile',
        'Purpose',
        'Host',
        'Department',
        'Check-in',
        'Check-out',
        'Status',
        'Visit date',
      ],
      report.data.map((row) => [
        row.visitorCode,
        row.name,
        row.mobile,
        row.purpose,
        row.hostName,
        row.departmentName,
        row.checkInAt,
        row.checkOutAt,
        row.status,
        row.visitDate,
      ]),
    );
  }

  private async assertSchoolOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: VISITOR_REPORT_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: VISITOR_REPORT_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use school visitor reports',
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

function formatStaffName(staff: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  const display = staff.displayName?.trim();
  if (display) {
    return display;
  }
  return `${staff.firstName} ${staff.lastName}`.trim();
}
