import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, EmploymentStatus, Prisma } from '@prisma/client';
import { formatAttendanceDate, parseAttendanceDate } from '../../attendance/utils/attendance-date.util';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import { getLocalDateString } from '../../dashboard/utils/dashboard-date.util';
import { PLATFORM_ORGANIZATION_CODE } from '../../organizations/constants/organization.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ATTENDANCE_REPORT_ERROR_CODES } from './constants/attendance-report.constants';
import { buildCsv } from '../common/csv-export.util';
import { MAX_REPORT_CSV_EXPORT_ROWS } from '../common/max-export-rows';
import { AttendanceReportQueryDto } from './dto/attendance-report-query.dto';

const recordSelect = {
  id: true,
  attendanceDate: true,
  status: true,
  checkInAt: true,
  checkOutAt: true,
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
} as const;

type AttendanceReportRecord = Prisma.StaffAttendanceGetPayload<{ select: typeof recordSelect }>;

@Injectable()
export class AttendanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(organizationId: string, query: AttendanceReportQueryDto) {
    await this.assertSchoolOrganization(organizationId);
    const timezone = await this.getOrganizationTimezone(organizationId);
    const { fromDate, toDate, scope } = this.resolveDateRange(query, timezone);
    const where = this.buildWhere(organizationId, fromDate, toDate, query);

    const [records, total, statusGroups, activeStaff] = await Promise.all([
      this.prisma.staffAttendance.findMany({
        where,
        select: recordSelect,
        orderBy: [{ attendanceDate: 'desc' }, { staff: { firstName: 'asc' } }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.staffAttendance.count({ where }),
      this.prisma.staffAttendance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      scope === 'single_day'
        ? this.countActiveStaff(organizationId, query.departmentId, query.staffId)
        : Promise.resolve(null),
    ]);

    const byStatus = Object.fromEntries(
      statusGroups.map((group) => [group.status, group._count._all]),
    ) as Record<string, number>;

    const present = byStatus[AttendanceStatus.PRESENT] ?? 0;
    const absent = byStatus[AttendanceStatus.ABSENT] ?? 0;
    const totalMarked = total;
    const unmarked =
      scope === 'single_day' && activeStaff !== null
        ? Math.max(activeStaff - totalMarked, 0)
        : null;

    const attendancePercentage = this.calculateAttendancePercentage(
      scope,
      present,
      activeStaff,
      totalMarked,
    );

    const byDepartment = await this.buildDepartmentBreakdown(
      organizationId,
      fromDate,
      toDate,
      query,
    );

    return {
      data: records.map((record) => this.toRecordDto(record)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
      summary: {
        scope,
        fromDate,
        toDate,
        timezone,
        activeStaff,
        totalMarked,
        present,
        absent,
        unmarked,
        attendancePercentage,
        byStatus,
      },
      breakdown: {
        byDepartment,
      },
    };
  }

  private async assertSchoolOrganization(organizationId: string): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: ATTENDANCE_REPORT_ERROR_CODES.ORGANIZATION_NOT_FOUND,
        message: 'Organization not found',
      });
    }

    if (organization.code === PLATFORM_ORGANIZATION_CODE) {
      throw new ForbiddenException({
        code: ATTENDANCE_REPORT_ERROR_CODES.PLATFORM_ORGANIZATION,
        message: 'Platform organizations do not use institution attendance reports',
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

  resolveDateRange(
    query: AttendanceReportQueryDto,
    timezone: string,
  ): { fromDate: string; toDate: string; scope: 'single_day' | 'date_range' } {
    if (query.date && (query.startDate || query.endDate)) {
      throw new BadRequestException({
        code: ATTENDANCE_REPORT_ERROR_CODES.CONFLICTING_DATE_PARAMS,
        message: 'Use either date or startDate/endDate, not both',
      });
    }

    if (query.date) {
      const parsed = formatAttendanceDate(parseAttendanceDate(query.date));
      return { fromDate: parsed, toDate: parsed, scope: 'single_day' };
    }

    const fromDate = query.startDate ?? query.endDate ?? getLocalDateString(timezone);
    const toDate = query.endDate ?? query.startDate ?? fromDate;

    parseAttendanceDate(fromDate);
    parseAttendanceDate(toDate);

    if (toDate < fromDate) {
      throw new BadRequestException({
        code: ATTENDANCE_REPORT_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'endDate cannot be earlier than startDate',
      });
    }

    const scope = fromDate === toDate ? 'single_day' : 'date_range';
    return { fromDate, toDate, scope };
  }

  private buildWhere(
    organizationId: string,
    fromDate: string,
    toDate: string,
    query: AttendanceReportQueryDto,
  ): Prisma.StaffAttendanceWhereInput {
    return {
      organizationId,
      attendanceDate: {
        gte: parseAttendanceDate(fromDate),
        lte: parseAttendanceDate(toDate),
      },
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { staff: { departmentId: query.departmentId } } : {}),
    };
  }

  private async countActiveStaff(
    organizationId: string,
    departmentId?: string,
    staffId?: string,
  ): Promise<number> {
    return this.prisma.staff.count({
      where: {
        organizationId,
        employmentStatus: EmploymentStatus.ACTIVE,
        ...(staffId ? { id: staffId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
    });
  }

  private calculateAttendancePercentage(
    scope: 'single_day' | 'date_range',
    present: number,
    activeStaff: number | null,
    totalMarked: number,
  ): number | null {
    if (scope === 'single_day') {
      if (!activeStaff || activeStaff <= 0) {
        return null;
      }
      return this.roundPercentage((present / activeStaff) * 100);
    }

    if (totalMarked <= 0) {
      return null;
    }
    return this.roundPercentage((present / totalMarked) * 100);
  }

  private roundPercentage(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private async buildDepartmentBreakdown(
    organizationId: string,
    fromDate: string,
    toDate: string,
    query: AttendanceReportQueryDto,
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
        const segmentWhere = this.buildWhere(organizationId, fromDate, toDate, {
          ...query,
          departmentId: segment.departmentId ?? undefined,
        });
        if (segment.departmentId === null) {
          segmentWhere.staff = { departmentId: { equals: null } };
        }

        const [total, present, absent] = await Promise.all([
          this.prisma.staffAttendance.count({ where: segmentWhere }),
          this.prisma.staffAttendance.count({
            where: { ...segmentWhere, status: AttendanceStatus.PRESENT },
          }),
          this.prisma.staffAttendance.count({
            where: { ...segmentWhere, status: AttendanceStatus.ABSENT },
          }),
        ]);

        return {
          departmentId: segment.departmentId,
          departmentName: segment.departmentName,
          total,
          present,
          absent,
          attendancePercentage: total > 0 ? this.roundPercentage((present / total) * 100) : null,
        };
      }),
    );

    return breakdown.filter((row) => row.total > 0);
  }

  private toRecordDto(record: AttendanceReportRecord) {
    const staffName =
      record.staff.displayName?.trim() ||
      `${record.staff.firstName} ${record.staff.lastName}`.trim();

    return {
      id: record.id,
      attendanceDate: formatAttendanceDate(record.attendanceDate),
      staffId: record.staff.id,
      staffName,
      employeeCode: record.staff.employeeCode,
      departmentId: record.staff.departmentId,
      departmentName: record.staff.department?.name ?? null,
      status: record.status,
      checkInAt: record.checkInAt?.toISOString() ?? null,
      checkOutAt: record.checkOutAt?.toISOString() ?? null,
    };
  }

  async exportCsv(organizationId: string, query: AttendanceReportQueryDto): Promise<string> {
    const report = await this.generate(organizationId, {
      ...query,
      page: 1,
      pageSize: MAX_REPORT_CSV_EXPORT_ROWS,
    });
    return buildCsv(
      ['Date', 'Employee code', 'Staff name', 'Department', 'Status', 'Check-in at', 'Check-out at'],
      report.data.map((row) => [
        row.attendanceDate,
        row.employeeCode,
        row.staffName,
        row.departmentName,
        row.status,
        row.checkInAt,
        row.checkOutAt,
      ]),
    );
  }
}
