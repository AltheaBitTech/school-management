import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmploymentStatus, Prisma, StaffAttendance } from '@prisma/client';
import { buildPaginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ATTENDANCE_ERROR_CODES } from './constants/attendance.constants';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  assertValidCheckInOut,
  formatAttendanceDate,
  parseAttendanceDate,
  parseOptionalDateTime,
} from './utils/attendance-date.util';

type AttendanceWithStaff = StaffAttendance & {
  staff: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    departmentId: string | null;
    employmentStatus: EmploymentStatus;
  };
};

const staffSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  displayName: true,
  departmentId: true,
  employmentStatus: true,
} as const;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateAttendanceDto): Promise<AttendanceWithStaff> {
    const attendanceDate = parseAttendanceDate(dto.attendanceDate);
    const checkInAt = parseOptionalDateTime(dto.checkInAt) ?? null;
    const checkOutAt = parseOptionalDateTime(dto.checkOutAt) ?? null;
    assertValidCheckInOut(checkInAt, checkOutAt);

    await this.assertStaffEligibleForMarking(organizationId, dto.staffId);

    try {
      return await this.prisma.staffAttendance.create({
        data: {
          organizationId,
          staffId: dto.staffId,
          attendanceDate,
          status: dto.status,
          checkInAt,
          checkOutAt,
          remarks: dto.remarks?.trim() || null,
        },
        include: { staff: { select: staffSelect } },
      });
    } catch (error: unknown) {
      this.handleUniqueViolation(error);
      throw error;
    }
  }

  async list(organizationId: string, query: ListAttendanceQueryDto) {
    const where = this.buildListWhere(organizationId, query);

    const [items, total] = await Promise.all([
      this.prisma.staffAttendance.findMany({
        where,
        include: { staff: { select: staffSelect } },
        orderBy: [{ attendanceDate: 'desc' }, { staff: { firstName: 'asc' } }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.staffAttendance.count({ where }),
    ]);

    return {
      data: items.map((item) => this.toDto(item)),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findById(organizationId: string, attendanceId: string): Promise<AttendanceWithStaff> {
    const attendance = await this.prisma.staffAttendance.findFirst({
      where: { id: attendanceId, organizationId },
      include: { staff: { select: staffSelect } },
    });

    if (!attendance) {
      throw new NotFoundException({
        code: ATTENDANCE_ERROR_CODES.ATTENDANCE_NOT_FOUND,
        message: 'Attendance record not found',
      });
    }

    return attendance;
  }

  async update(
    organizationId: string,
    attendanceId: string,
    dto: UpdateAttendanceDto,
  ): Promise<AttendanceWithStaff> {
    const existing = await this.findById(organizationId, attendanceId);

    const nextCheckInAt =
      dto.checkInAt !== undefined
        ? parseOptionalDateTime(dto.checkInAt)
        : existing.checkInAt;
    const nextCheckOutAt =
      dto.checkOutAt !== undefined
        ? parseOptionalDateTime(dto.checkOutAt)
        : existing.checkOutAt;
    assertValidCheckInOut(nextCheckInAt, nextCheckOutAt);

    return this.prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.checkInAt !== undefined ? { checkInAt: nextCheckInAt } : {}),
        ...(dto.checkOutAt !== undefined ? { checkOutAt: nextCheckOutAt } : {}),
        ...(dto.remarks !== undefined ? { remarks: dto.remarks?.trim() || null } : {}),
      },
      include: { staff: { select: staffSelect } },
    });
  }

  toDto(attendance: AttendanceWithStaff) {
    return {
      id: attendance.id,
      organizationId: attendance.organizationId,
      staffId: attendance.staffId,
      attendanceDate: formatAttendanceDate(attendance.attendanceDate),
      checkInAt: attendance.checkInAt?.toISOString() ?? null,
      checkOutAt: attendance.checkOutAt?.toISOString() ?? null,
      status: attendance.status,
      lateFlag: attendance.lateFlag,
      earlyDepartureFlag: attendance.earlyDepartureFlag,
      remarks: attendance.remarks,
      staff: {
        id: attendance.staff.id,
        employeeCode: attendance.staff.employeeCode,
        firstName: attendance.staff.firstName,
        lastName: attendance.staff.lastName,
        displayName: attendance.staff.displayName,
        departmentId: attendance.staff.departmentId,
      },
      createdAt: attendance.createdAt.toISOString(),
      updatedAt: attendance.updatedAt.toISOString(),
    };
  }

  private buildListWhere(
    organizationId: string,
    query: ListAttendanceQueryDto,
  ): Prisma.StaffAttendanceWhereInput {
    const attendanceDateFilter = this.buildDateFilter(query);

    return {
      organizationId,
      ...(query.staffId ? { staffId: query.staffId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { staff: { departmentId: query.departmentId } } : {}),
      ...attendanceDateFilter,
    };
  }

  private buildDateFilter(
    query: ListAttendanceQueryDto,
  ): Prisma.StaffAttendanceWhereInput | undefined {
    if (query.attendanceDate) {
      return { attendanceDate: parseAttendanceDate(query.attendanceDate) };
    }

    if (query.fromDate || query.toDate) {
      return {
        attendanceDate: {
          ...(query.fromDate ? { gte: parseAttendanceDate(query.fromDate) } : {}),
          ...(query.toDate ? { lte: parseAttendanceDate(query.toDate) } : {}),
        },
      };
    }

    return undefined;
  }

  private async assertStaffEligibleForMarking(
    organizationId: string,
    staffId: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, organizationId },
    });

    if (!staff) {
      throw new BadRequestException({
        code: ATTENDANCE_ERROR_CODES.INVALID_STAFF,
        message: 'Staff member does not belong to this organization',
      });
    }

    if (staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: ATTENDANCE_ERROR_CODES.STAFF_NOT_ELIGIBLE,
        message: 'Attendance cannot be marked for offboarded staff',
      });
    }
  }

  private handleUniqueViolation(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: ATTENDANCE_ERROR_CODES.DUPLICATE_ATTENDANCE,
        message: 'Attendance already exists for this staff member on the selected date',
      });
    }
  }
}
