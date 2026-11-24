import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, ClassStatus, EmploymentStatus, Prisma, StudentStatus } from '@prisma/client';
import { formatAttendanceDate, parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { getLocalDateString } from '../dashboard/utils/dashboard-date.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  STUDENT_ATTENDANCE_ERROR_CODES,
  STUDENT_ATTENDANCE_PERMISSIONS,
  STUDENT_HISTORY_DEFAULT_DAYS,
  STUDENT_HISTORY_MAX_DAYS,
} from './constants/student-attendance.constants';
import { CreateSectionSubstituteDto, SaveSectionAttendanceDto } from './dto/student-attendance.dto';

/** Who is acting, with the permissions resolved by PermissionsGuard for this request. */
export type StudentAttendanceActor = {
  userId: string;
  organizationId: string;
  permissions: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type SectionAccessRole = 'ADMIN' | 'CLASS_TEACHER' | 'SUBSTITUTE';

const sectionSelect = {
  id: true,
  name: true,
  classId: true,
  status: true,
  classTeacherId: true,
  academicUnit: { select: { name: true, displayOrder: true } },
  classTeacher: { select: { id: true, firstName: true, lastName: true, displayName: true } },
} satisfies Prisma.SectionSelect;

type SectionRow = Prisma.SectionGetPayload<{ select: typeof sectionSelect }>;

type PersonName = { firstName: string; lastName: string; displayName: string | null };

function personName(person: PersonName | null | undefined): string | null {
  if (!person) return null;
  return person.displayName?.trim() || `${person.firstName} ${person.lastName}`.trim();
}

@Injectable()
export class StudentAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sections the actor may take attendance for on the given date (default: today). */
  async listMySections(actor: StudentAttendanceActor, date?: string) {
    const today = await this.todayFor(actor.organizationId);
    const attendanceDate = parseAttendanceDate(date ?? today);
    const isAdmin = this.isAdmin(actor);
    const staffId = await this.findStaffId(actor);

    const result: Array<ReturnType<typeof this.toSectionDto> & { role: SectionAccessRole; substituteUntil: string | null }> = [];
    const seen = new Set<string>();

    if (staffId) {
      const own = await this.prisma.section.findMany({
        where: { organizationId: actor.organizationId, classTeacherId: staffId, status: ClassStatus.ACTIVE },
        select: sectionSelect,
      });
      for (const section of own) {
        seen.add(section.id);
        result.push({ ...this.toSectionDto(section), role: 'CLASS_TEACHER', substituteUntil: null });
      }

      const substitutes = await this.prisma.sectionAttendanceSubstitute.findMany({
        where: {
          ...this.activeSubstituteWhere(actor.organizationId, attendanceDate, parseAttendanceDate(today)),
          staffId,
          section: { status: ClassStatus.ACTIVE },
        },
        select: { toDate: true, section: { select: sectionSelect } },
        orderBy: { toDate: 'desc' },
      });
      for (const substitute of substitutes) {
        if (seen.has(substitute.section.id)) continue;
        seen.add(substitute.section.id);
        result.push({
          ...this.toSectionDto(substitute.section),
          role: 'SUBSTITUTE',
          substituteUntil: formatAttendanceDate(substitute.toDate),
        });
      }
    }

    if (isAdmin) {
      const all = await this.prisma.section.findMany({
        where: { organizationId: actor.organizationId, status: ClassStatus.ACTIVE, id: { notIn: [...seen] } },
        select: sectionSelect,
      });
      for (const section of all) {
        result.push({ ...this.toSectionDto(section), role: 'ADMIN', substituteUntil: null });
      }
    }

    result.sort(
      (a, b) =>
        a.classDisplayOrder - b.classDisplayOrder ||
        a.className.localeCompare(b.className) ||
        a.name.localeCompare(b.name),
    );

    return { attendanceDate: formatAttendanceDate(attendanceDate), today, sections: result };
  }

  async getSectionAttendance(actor: StudentAttendanceActor, sectionId: string, date?: string) {
    const today = await this.todayFor(actor.organizationId);
    const attendanceDate = parseAttendanceDate(date ?? today);
    const { section, role } = await this.assertCanAccessSection(actor, sectionId, attendanceDate, today);
    return this.buildSectionAttendance(actor, section, role, attendanceDate);
  }

  async saveSectionAttendance(
    actor: StudentAttendanceActor,
    sectionId: string,
    dto: SaveSectionAttendanceDto,
  ) {
    const today = await this.todayFor(actor.organizationId);
    const attendanceDate = parseAttendanceDate(dto.attendanceDate);

    if (attendanceDate > parseAttendanceDate(today)) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.FUTURE_DATE,
        message: 'Attendance cannot be marked for a future date',
      });
    }

    const { section, role } = await this.assertCanAccessSection(actor, sectionId, attendanceDate, today);

    const studentIds = [...new Set(dto.entries.map((entry) => entry.studentId))];
    const validStudents = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        organizationId: actor.organizationId,
        sectionId: section.id,
        status: StudentStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (validStudents.length !== studentIds.length) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.INVALID_STUDENT,
        message: 'One or more students do not belong to this section',
      });
    }

    await this.prisma.$transaction(
      dto.entries.map((entry) =>
        this.prisma.studentAttendance.upsert({
          where: {
            organizationId_studentId_attendanceDate: {
              organizationId: actor.organizationId,
              studentId: entry.studentId,
              attendanceDate,
            },
          },
          create: {
            organizationId: actor.organizationId,
            studentId: entry.studentId,
            sectionId: section.id,
            attendanceDate,
            status: entry.status,
            remarks: entry.remarks?.trim() || null,
            markedByUserId: actor.userId,
          },
          update: {
            sectionId: section.id,
            status: entry.status,
            remarks: entry.remarks?.trim() || null,
            markedByUserId: actor.userId,
          },
        }),
      ),
    );

    return this.buildSectionAttendance(actor, section, role, attendanceDate);
  }

  async listSubstitutes(organizationId: string, sectionId: string) {
    await this.findSection(organizationId, sectionId);
    const today = parseAttendanceDate(await this.todayFor(organizationId));
    const rows = await this.prisma.sectionAttendanceSubstitute.findMany({
      where: { organizationId, sectionId, revokedAt: null, toDate: { gte: today } },
      include: { staff: { select: { id: true, firstName: true, lastName: true, displayName: true } } },
      orderBy: { fromDate: 'asc' },
    });
    return rows.map((row) => this.toSubstituteDto(row));
  }

  async createSubstitute(
    actor: StudentAttendanceActor,
    sectionId: string,
    dto: CreateSectionSubstituteDto,
  ) {
    const section = await this.findSection(actor.organizationId, sectionId);
    const fromDate = parseAttendanceDate(dto.fromDate);
    const toDate = parseAttendanceDate(dto.toDate);

    if (fromDate > toDate) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.INVALID_DATE_RANGE,
        message: 'Start date must be on or before end date',
      });
    }

    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, organizationId: actor.organizationId },
      select: { id: true, employmentStatus: true },
    });
    if (!staff || staff.employmentStatus === EmploymentStatus.OFFBOARDED) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.INVALID_SUBSTITUTE,
        message: 'Substitute must be an active staff member of this institution',
      });
    }
    if (section.classTeacherId === staff.id) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.INVALID_SUBSTITUTE,
        message: 'This staff member is already the class teacher of the section',
      });
    }

    const created = await this.prisma.sectionAttendanceSubstitute.create({
      data: {
        organizationId: actor.organizationId,
        sectionId: section.id,
        staffId: staff.id,
        fromDate,
        toDate,
        reason: dto.reason?.trim() || null,
        createdByUserId: actor.userId,
      },
      include: { staff: { select: { id: true, firstName: true, lastName: true, displayName: true } } },
    });
    return this.toSubstituteDto(created);
  }

  async revokeSubstitute(organizationId: string, substituteId: string) {
    const existing = await this.prisma.sectionAttendanceSubstitute.findFirst({
      where: { id: substituteId, organizationId, revokedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.SUBSTITUTE_NOT_FOUND,
        message: 'Substitute assignment not found',
      });
    }
    await this.prisma.sectionAttendanceSubstitute.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Attendance history for one student. Admins (manage permission) see any student;
   * other users only students currently in a section where they are the class teacher.
   * Percentage = (present + half-day × 0.5) / all marked days (leave counts as not attended).
   */
  async getStudentHistory(actor: StudentAttendanceActor, studentId: string, from?: string, to?: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, organizationId: actor.organizationId },
      select: { id: true, sectionId: true, sectionRef: { select: { classTeacherId: true } } },
    });
    if (!student) {
      throw new NotFoundException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student not found',
      });
    }

    if (!this.isAdmin(actor)) {
      const staffId = await this.findStaffId(actor);
      if (!staffId || student.sectionRef?.classTeacherId !== staffId) {
        throw new ForbiddenException({
          code: STUDENT_ATTENDANCE_ERROR_CODES.NOT_SECTION_TEACHER,
          message: "Only the class teacher can view this student's attendance",
        });
      }
    }

    const toDate = parseAttendanceDate(to ?? (await this.todayFor(actor.organizationId)));
    const fromDate = from
      ? parseAttendanceDate(from)
      : new Date(toDate.getTime() - (STUDENT_HISTORY_DEFAULT_DAYS - 1) * DAY_MS);
    const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
    if (spanDays < 1 || spanDays > STUDENT_HISTORY_MAX_DAYS) {
      throw new BadRequestException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.INVALID_DATE_RANGE,
        message: `Date range must be between 1 and ${STUDENT_HISTORY_MAX_DAYS} days`,
      });
    }

    const records = await this.prisma.studentAttendance.findMany({
      where: {
        organizationId: actor.organizationId,
        studentId: student.id,
        attendanceDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { attendanceDate: 'desc' },
      select: {
        id: true,
        attendanceDate: true,
        status: true,
        remarks: true,
        section: { select: { name: true, academicUnit: { select: { name: true } } } },
      },
    });

    const summary = { total: records.length, present: 0, absent: 0, halfDay: 0, onLeave: 0, percentage: null as number | null };
    for (const record of records) {
      if (record.status === AttendanceStatus.PRESENT) summary.present += 1;
      else if (record.status === AttendanceStatus.ABSENT) summary.absent += 1;
      else if (record.status === AttendanceStatus.HALF_DAY) summary.halfDay += 1;
      else if (record.status === AttendanceStatus.ON_LEAVE) summary.onLeave += 1;
    }
    if (summary.total > 0) {
      const attended = summary.present + summary.halfDay * 0.5;
      summary.percentage = Math.round((attended / summary.total) * 1000) / 10;
    }

    return {
      studentId: student.id,
      from: formatAttendanceDate(fromDate),
      to: formatAttendanceDate(toDate),
      summary,
      records: records.map((record) => ({
        id: record.id,
        date: formatAttendanceDate(record.attendanceDate),
        status: record.status,
        remarks: record.remarks,
        sectionLabel: `${record.section.academicUnit.name} - ${record.section.name}`,
      })),
    };
  }

  /**
   * Access order: admin (manage permission) → class teacher → active substitute for that date.
   * A substitute only has access while the assignment is still running (toDate >= today).
   */
  async assertCanAccessSection(
    actor: StudentAttendanceActor,
    sectionId: string,
    attendanceDate: Date,
    today: string,
  ): Promise<{ section: SectionRow; role: SectionAccessRole }> {
    const section = await this.findSection(actor.organizationId, sectionId);

    if (this.isAdmin(actor)) {
      return { section, role: 'ADMIN' };
    }

    const staffId = await this.findStaffId(actor);
    if (staffId && section.classTeacherId === staffId) {
      return { section, role: 'CLASS_TEACHER' };
    }

    if (staffId) {
      const substitute = await this.prisma.sectionAttendanceSubstitute.findFirst({
        where: {
          ...this.activeSubstituteWhere(actor.organizationId, attendanceDate, parseAttendanceDate(today)),
          sectionId: section.id,
          staffId,
        },
        select: { id: true },
      });
      if (substitute) {
        return { section, role: 'SUBSTITUTE' };
      }
    }

    throw new ForbiddenException({
      code: STUDENT_ATTENDANCE_ERROR_CODES.NOT_SECTION_TEACHER,
      message: 'Only the class teacher or an assigned substitute can take attendance for this section',
    });
  }

  private activeSubstituteWhere(
    organizationId: string,
    attendanceDate: Date,
    today: Date,
  ): Prisma.SectionAttendanceSubstituteWhereInput {
    return {
      organizationId,
      revokedAt: null,
      fromDate: { lte: attendanceDate },
      AND: [{ toDate: { gte: attendanceDate } }, { toDate: { gte: today } }],
    };
  }

  private async buildSectionAttendance(
    actor: StudentAttendanceActor,
    section: SectionRow,
    role: SectionAccessRole,
    attendanceDate: Date,
  ) {
    const students = await this.prisma.student.findMany({
      where: { organizationId: actor.organizationId, sectionId: section.id, status: StudentStatus.ACTIVE },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        displayName: true,
        rollNumber: true,
        attendance: {
          where: { attendanceDate },
          select: { id: true, status: true, remarks: true, updatedAt: true },
          take: 1,
        },
      },
    });

    const sorted = students.sort((a, b) => {
      const rollA = a.rollNumber ?? '';
      const rollB = b.rollNumber ?? '';
      if (rollA !== rollB) {
        if (!rollA) return 1;
        if (!rollB) return -1;
        return rollA.localeCompare(rollB, undefined, { numeric: true });
      }
      return (personName(a) ?? '').localeCompare(personName(b) ?? '');
    });

    const canMark =
      this.isAdmin(actor) || actor.permissions.includes(STUDENT_ATTENDANCE_PERMISSIONS.MARK);

    return {
      section: { ...this.toSectionDto(section), role },
      attendanceDate: formatAttendanceDate(attendanceDate),
      canMark,
      students: sorted.map((student) => {
        const record = student.attendance[0];
        return {
          id: student.id,
          studentCode: student.studentCode,
          name: personName(student) ?? student.studentCode,
          rollNumber: student.rollNumber,
          attendance: record
            ? { id: record.id, status: record.status, remarks: record.remarks, updatedAt: record.updatedAt.toISOString() }
            : null,
        };
      }),
    };
  }

  private async findSection(organizationId: string, sectionId: string): Promise<SectionRow> {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, organizationId },
      select: sectionSelect,
    });
    if (!section) {
      throw new NotFoundException({
        code: STUDENT_ATTENDANCE_ERROR_CODES.SECTION_NOT_FOUND,
        message: 'Section not found',
      });
    }
    return section;
  }

  private async findStaffId(actor: StudentAttendanceActor): Promise<string | null> {
    const staff = await this.prisma.staff.findFirst({
      where: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        employmentStatus: { not: EmploymentStatus.OFFBOARDED },
      },
      select: { id: true },
    });
    return staff?.id ?? null;
  }

  private isAdmin(actor: StudentAttendanceActor): boolean {
    return actor.permissions.includes(STUDENT_ATTENDANCE_PERMISSIONS.MANAGE);
  }

  private async todayFor(organizationId: string): Promise<string> {
    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { timezone: true },
    });
    return getLocalDateString(settings?.timezone ?? 'UTC');
  }

  private toSectionDto(section: SectionRow) {
    return {
      id: section.id,
      name: section.name,
      classId: section.classId,
      className: section.academicUnit.name,
      classDisplayOrder: section.academicUnit.displayOrder,
      label: `${section.academicUnit.name} - ${section.name}`,
      classTeacherId: section.classTeacherId,
      classTeacherName: personName(section.classTeacher),
    };
  }

  private toSubstituteDto(row: {
    id: string;
    sectionId: string;
    staffId: string;
    fromDate: Date;
    toDate: Date;
    reason: string | null;
    createdAt: Date;
    staff: PersonName & { id: string };
  }) {
    return {
      id: row.id,
      sectionId: row.sectionId,
      staffId: row.staffId,
      staffName: personName(row.staff),
      fromDate: formatAttendanceDate(row.fromDate),
      toDate: formatAttendanceDate(row.toDate),
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
