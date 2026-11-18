import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClassStatus } from '@prisma/client';
import { parseAttendanceDate } from '../attendance/utils/attendance-date.util';
import { StudentAttendanceService } from './student-attendance.service';

describe('StudentAttendanceService', () => {
  const organizationId = 'org-1';
  const sectionId = 'section-1';
  const classTeacherStaffId = 'staff-teacher';
  const otherStaffId = 'staff-other';

  const section = {
    id: sectionId,
    name: 'A',
    classId: 'class-1',
    status: ClassStatus.ACTIVE,
    classTeacherId: classTeacherStaffId,
    academicUnit: { name: 'Grade 5', displayOrder: 5 },
    classTeacher: { id: classTeacherStaffId, firstName: 'Asha', lastName: 'Rao', displayName: null },
  };

  const prisma = {
    organizationSettings: { findUnique: jest.fn() },
    section: { findFirst: jest.fn(), findMany: jest.fn() },
    staff: { findFirst: jest.fn() },
    student: { findMany: jest.fn() },
    studentAttendance: { upsert: jest.fn() },
    sectionAttendanceSubstitute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const teacher = (staffId: string) => {
    prisma.staff.findFirst.mockResolvedValue({ id: staffId });
    return { userId: `user-${staffId}`, organizationId, permissions: ['student.attendance.view', 'student.attendance.mark'] };
  };
  const admin = { userId: 'user-admin', organizationId, permissions: ['student.attendance.view', 'student.attendance.manage'] };

  let service: StudentAttendanceService;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.organizationSettings.findUnique.mockResolvedValue({ timezone: 'UTC' });
    prisma.section.findFirst.mockResolvedValue(section);
    prisma.sectionAttendanceSubstitute.findFirst.mockResolvedValue(null);
    prisma.student.findMany.mockResolvedValue([]);
    prisma.$transaction.mockResolvedValue([]);
    service = new StudentAttendanceService(prisma as never);
  });

  describe('assertCanAccessSection', () => {
    it('allows the class teacher', async () => {
      const result = await service.assertCanAccessSection(
        teacher(classTeacherStaffId),
        sectionId,
        parseAttendanceDate(today),
        today,
      );
      expect(result.role).toBe('CLASS_TEACHER');
      expect(prisma.sectionAttendanceSubstitute.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a teacher of another section without a substitute assignment', async () => {
      await expect(
        service.assertCanAccessSection(teacher(otherStaffId), sectionId, parseAttendanceDate(today), today),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows an admin on any section without a staff profile', async () => {
      const result = await service.assertCanAccessSection(admin, sectionId, parseAttendanceDate(today), today);
      expect(result.role).toBe('ADMIN');
      expect(prisma.staff.findFirst).not.toHaveBeenCalled();
    });

    it('allows a substitute whose assignment covers the date', async () => {
      prisma.sectionAttendanceSubstitute.findFirst.mockResolvedValue({ id: 'sub-1' });
      const result = await service.assertCanAccessSection(
        teacher(otherStaffId),
        sectionId,
        parseAttendanceDate(today),
        today,
      );
      expect(result.role).toBe('SUBSTITUTE');

      const where = prisma.sectionAttendanceSubstitute.findFirst.mock.calls[0][0].where;
      expect(where).toMatchObject({
        organizationId,
        sectionId,
        staffId: otherStaffId,
        revokedAt: null,
        fromDate: { lte: parseAttendanceDate(today) },
      });
      expect(where.AND).toEqual([
        { toDate: { gte: parseAttendanceDate(today) } },
        { toDate: { gte: parseAttendanceDate(today) } },
      ]);
    });

    it('rejects a substitute when no active assignment matches (out of range or revoked)', async () => {
      prisma.sectionAttendanceSubstitute.findFirst.mockResolvedValue(null);
      await expect(
        service.assertCanAccessSection(teacher(otherStaffId), sectionId, parseAttendanceDate(today), today),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('saveSectionAttendance', () => {
    it('rejects students who are not in the section', async () => {
      prisma.student.findMany.mockResolvedValueOnce([{ id: 'student-1' }]);
      await expect(
        service.saveSectionAttendance(teacher(classTeacherStaffId), sectionId, {
          attendanceDate: today,
          entries: [
            { studentId: 'student-1', status: 'PRESENT' },
            { studentId: 'student-foreign', status: 'ABSENT' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects future dates', async () => {
      await expect(
        service.saveSectionAttendance(teacher(classTeacherStaffId), sectionId, {
          attendanceDate: '2999-01-01',
          entries: [{ studentId: 'student-1', status: 'PRESENT' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('upserts every entry in one transaction', async () => {
      prisma.student.findMany
        .mockResolvedValueOnce([{ id: 'student-1' }, { id: 'student-2' }])
        .mockResolvedValueOnce([]);
      await service.saveSectionAttendance(teacher(classTeacherStaffId), sectionId, {
        attendanceDate: today,
        entries: [
          { studentId: 'student-1', status: 'PRESENT' },
          { studentId: 'student-2', status: 'ABSENT', remarks: ' sick ' },
        ],
      });
      expect(prisma.studentAttendance.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.studentAttendance.upsert.mock.calls[1][0].create).toMatchObject({
        sectionId,
        status: 'ABSENT',
        remarks: 'sick',
        markedByUserId: `user-${classTeacherStaffId}`,
      });
    });
  });

  describe('createSubstitute', () => {
    it('rejects the class teacher as their own substitute', async () => {
      prisma.staff.findFirst.mockResolvedValue({ id: classTeacherStaffId, employmentStatus: 'ACTIVE' });
      await expect(
        service.createSubstitute(admin, sectionId, {
          staffId: classTeacherStaffId,
          fromDate: today,
          toDate: today,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.createSubstitute(admin, sectionId, {
          staffId: otherStaffId,
          fromDate: '2026-11-20',
          toDate: '2026-11-18',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
