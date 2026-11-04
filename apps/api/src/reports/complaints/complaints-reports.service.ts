import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplaintStatus, Prisma } from '@prisma/client';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { OPEN_COMPLAINT_STATUSES } from '../../dashboard/constants/dashboard.constants';
import { getLocalDayUtcRange } from '../../dashboard/utils/dashboard-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import {
  COMPLAINT_AGE_BUCKETS,
  COMPLAINT_REPORT_ERROR_CODES,
  HIGH_COMPLAINT_PRIORITIES,
} from './constants/complaint-report.constants';
import { buildCsv } from '../common/csv-export.util';
import { ComplaintReportQueryDto } from './dto/complaint-report-query.dto';

import { MAX_REPORT_CSV_EXPORT_ROWS } from '../common/max-export-rows';

const MS_PER_DAY = 86_400_000;

const recordSelect = {
  id: true,
  complaintCode: true,
  title: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  closedAt: true,
  assignedToStaff: {
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

type ComplaintReportRecord = Prisma.ComplaintGetPayload<{ select: typeof recordSelect }>;

@Injectable()
export class ComplaintsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: ComplaintReportQueryDto) {
    await this.assertSchoolOrganization(organizationId);
    const timezone = await this.getOrganizationTimezone(organizationId);
    const dateContext = this.resolveDateContext(query, timezone);
    const where = this.buildWhere(organizationId, dateContext, query);

    const [
      records,
      total,
      statusGroups,
      priorityGroups,
      categoryGroups,
      highPriorityComplaints,
    ] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        select: recordSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['priority'],
        where,
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['category'],
        where,
        _count: { _all: true },
      }),
      this.prisma.complaint.count({
        where: {
          ...where,
          priority: { in: [...HIGH_COMPLAINT_PRIORITIES] },
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ) as Partial<Record<ComplaintStatus, number>>;

    const openComplaints = OPEN_COMPLAINT_STATUSES.reduce(
      (sum, status) => sum + (statusCounts[status] ?? 0),
      0,
    );
    const assignedComplaints = statusCounts[ComplaintStatus.ASSIGNED] ?? 0;
    const inProgressComplaints = statusCounts[ComplaintStatus.IN_PROGRESS] ?? 0;
    const completedComplaints = statusCounts[ComplaintStatus.COMPLETED] ?? 0;
    const closedComplaints = statusCounts[ComplaintStatus.CLOSED] ?? 0;

    const [byDepartment, byAssignee, ageing] = await Promise.all([
      this.buildDepartmentBreakdown(organizationId, where, query.departmentId),
      this.buildAssigneeBreakdown(organizationId, where, query.assigneeId),
      this.buildAgeingBuckets(where),
    ]);

    return {
      data: records.map((record) => this.toRecordDto(record)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary: {
        fromDate: dateContext.fromDate,
        toDate: dateContext.toDate,
        timezone,
        dateFilterApplied: dateContext.dateFilterApplied,
        totalComplaints: total,
        openComplaints,
        assignedComplaints,
        inProgressComplaints,
        completedComplaints,
        closedComplaints,
        highPriorityComplaints,
      },
      breakdown: {
        byStatus: statusGroups.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        byPriority: priorityGroups.map((row) => ({
          priority: row.priority,
          count: row._count._all,
        })),
        byCategory: categoryGroups.map((row) => ({
          category: row.category,
          count: row._count._all,
        })),
        byDepartment,
        byAssignee,
      },
      ageing,
    };
  }

  resolveDateContext(
    query: ComplaintReportQueryDto,
    timezone: string,
  ): {
    fromDate: string | null;
    toDate: string | null;
    dateFilterApplied: boolean;
    createdStartUtc?: Date;
    createdEndUtc?: Date;
  } {
    const fromDate = query.startDate ?? null;
    const toDate = query.endDate ?? null;

    if (fromDate && toDate && toDate < fromDate) {
      throw new BadRequestException({
        code: COMPLAINT_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'endDate cannot be earlier than startDate',
      });
    }

    if (!fromDate && !toDate) {
      return { fromDate: null, toDate: null, dateFilterApplied: false };
    }

    const effectiveFrom = fromDate ?? toDate!;
    const effectiveTo = toDate ?? fromDate!;
    const startRange = getLocalDayUtcRange(effectiveFrom, timezone);
    const endRange = getLocalDayUtcRange(effectiveTo, timezone);

    return {
      fromDate: effectiveFrom,
      toDate: effectiveTo,
      dateFilterApplied: true,
      createdStartUtc: startRange.startUtc,
      createdEndUtc: endRange.endUtc,
    };
  }

  buildWhere(
    organizationId: string,
    dateContext: ReturnType<ComplaintsReportsService['resolveDateContext']>,
    query: ComplaintReportQueryDto,
  ): Prisma.ComplaintWhereInput {
    const where: Prisma.ComplaintWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.assigneeId ? { assignedToStaffId: query.assigneeId } : {}),
      ...(query.departmentId
        ? {
            assignedToStaff: {
              organizationId,
              departmentId: query.departmentId,
            },
          }
        : {}),
    };

    if (query.openOnly && !query.status) {
      where.status = { in: [...OPEN_COMPLAINT_STATUSES] };
    }

    if (dateContext.dateFilterApplied && dateContext.createdStartUtc && dateContext.createdEndUtc) {
      where.createdAt = {
        gte: dateContext.createdStartUtc,
        lt: dateContext.createdEndUtc,
      };
    }

    return where;
  }

  private async buildDepartmentBreakdown(
    organizationId: string,
    where: Prisma.ComplaintWhereInput,
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
        : [{ departmentId: null, departmentName: 'Unassigned / no department' }]),
    ];

    return Promise.all(
      segments.map(async (segment) => {
        const segmentWhere: Prisma.ComplaintWhereInput = {
          ...where,
          ...(segment.departmentId
            ? {
                assignedToStaff: {
                  organizationId,
                  departmentId: segment.departmentId,
                },
              }
            : {
                OR: [
                  { assignedToStaffId: null },
                  { assignedToStaff: { departmentId: null } },
                ],
              }),
        };

        const [total, open, completed] = await Promise.all([
          this.prisma.complaint.count({ where: segmentWhere }),
          this.prisma.complaint.count({
            where: {
              ...segmentWhere,
              status: { in: [...OPEN_COMPLAINT_STATUSES] },
            },
          }),
          this.prisma.complaint.count({
            where: { ...segmentWhere, status: ComplaintStatus.COMPLETED },
          }),
        ]);

        return {
          departmentId: segment.departmentId,
          departmentName: segment.departmentName,
          total,
          open,
          completed,
        };
      }),
    );
  }

  private async buildAssigneeBreakdown(
    organizationId: string,
    where: Prisma.ComplaintWhereInput,
    assigneeIdFilter?: string,
  ) {
    const assigneeGroups = await this.prisma.complaint.groupBy({
      by: ['assignedToStaffId'],
      where: {
        ...where,
        assignedToStaffId: assigneeIdFilter ? assigneeIdFilter : { not: null },
      },
      _count: { _all: true },
    });

    const staffIds = assigneeGroups
      .map((group) => group.assignedToStaffId)
      .filter((id): id is string => id !== null);

    if (staffIds.length === 0) {
      return [];
    }

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
      staffIds.map(async (staffId) => {
        const segmentWhere: Prisma.ComplaintWhereInput = {
          ...where,
          assignedToStaffId: staffId,
        };
        const [total, open, completed] = await Promise.all([
          this.prisma.complaint.count({ where: segmentWhere }),
          this.prisma.complaint.count({
            where: {
              ...segmentWhere,
              status: { in: [...OPEN_COMPLAINT_STATUSES] },
            },
          }),
          this.prisma.complaint.count({
            where: { ...segmentWhere, status: ComplaintStatus.COMPLETED },
          }),
        ]);

        return {
          staffId,
          staffName: staffNameById.get(staffId) ?? 'Unknown',
          total,
          open,
          completed,
        };
      }),
    );

    return rows.sort((a, b) => a.staffName.localeCompare(b.staffName));
  }

  /**
   * Age buckets for non-closed complaints in the filtered set, using whole days from
   * createdAt to the report generation time (no SLA).
   */
  private async buildAgeingBuckets(where: Prisma.ComplaintWhereInput) {
    const now = Date.now();
    const activeWhere: Prisma.ComplaintWhereInput = {
      ...where,
      status: { not: ComplaintStatus.CLOSED },
    };

    const bucketCreatedAtFilters: Prisma.DateTimeFilter[] = [
      { gte: new Date(now - 2 * MS_PER_DAY) },
      {
        gte: new Date(now - 7 * MS_PER_DAY),
        lt: new Date(now - 2 * MS_PER_DAY),
      },
      {
        gte: new Date(now - 30 * MS_PER_DAY),
        lt: new Date(now - 7 * MS_PER_DAY),
      },
      { lt: new Date(now - 30 * MS_PER_DAY) },
    ];

    const counts = await Promise.all(
      COMPLAINT_AGE_BUCKETS.map(async (bucket, index) => {
        const count = await this.prisma.complaint.count({
          where: {
            ...activeWhere,
            createdAt: bucketCreatedAtFilters[index],
          },
        });

        return { key: bucket.key, label: bucket.label, count };
      }),
    );

    return counts;
  }

  private toRecordDto(record: ComplaintReportRecord) {
    const ageDays = computeAgeDays(record.createdAt, record.closedAt, record.status);
    const staff = record.assignedToStaff;

    return {
      id: record.id,
      complaintCode: record.complaintCode,
      title: record.title,
      category: record.category,
      priority: record.priority,
      status: record.status,
      departmentId: staff?.departmentId ?? null,
      departmentName: staff?.department?.name ?? null,
      assigneeStaffId: staff?.id ?? null,
      assigneeName: staff ? formatStaffName(staff) : null,
      createdAt: record.createdAt.toISOString(),
      ageDays,
      closedAt: record.closedAt?.toISOString() ?? null,
    };
  }

  async exportCsv(organizationId: string, query: ComplaintReportQueryDto): Promise<string> {
    const report = await this.generate(organizationId, {
      ...query,
      page: 1,
      pageSize: MAX_REPORT_CSV_EXPORT_ROWS,
    });
    const headers = [
      'Complaint code',
      'Title',
      'Category',
      'Priority',
      'Status',
      'Department',
      'Assignee',
      'Created at',
      'Age (days)',
      'Closed at',
    ];
    const rows = report.data.map((row) => [
      row.complaintCode,
      row.title,
      row.category,
      row.priority,
      row.status,
      row.departmentName,
      row.assigneeName,
      row.createdAt,
      row.ageDays,
      row.closedAt,
    ]);
    return buildCsv(headers, rows);
  }

  private async assertSchoolOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: COMPLAINT_REPORT_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: COMPLAINT_REPORT_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use school complaint reports',
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

export function computeAgeDays(
  createdAt: Date,
  closedAt: Date | null,
  status: ComplaintStatus,
  referenceTime = new Date(),
): number {
  const end =
    status === ComplaintStatus.CLOSED && closedAt ? closedAt : referenceTime;
  return Math.max(0, Math.floor((end.getTime() - createdAt.getTime()) / MS_PER_DAY));
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
