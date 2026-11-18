import { AttendanceStatus } from '@prisma/client';

export const STUDENT_ATTENDANCE_ERROR_CODES = {
  SECTION_NOT_FOUND: 'SECTION_NOT_FOUND',
  NOT_SECTION_TEACHER: 'NOT_SECTION_TEACHER',
  INVALID_STUDENT: 'INVALID_STUDENT',
  FUTURE_DATE: 'FUTURE_DATE',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_SUBSTITUTE: 'INVALID_SUBSTITUTE',
  SUBSTITUTE_NOT_FOUND: 'SUBSTITUTE_NOT_FOUND',
} as const;

/** Statuses a teacher can pick for a student (staff-only values such as WEEK_OFF are excluded). */
export const STUDENT_ATTENDANCE_STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.HALF_DAY,
  AttendanceStatus.ON_LEAVE,
] as const;

export type StudentAttendanceStatus = (typeof STUDENT_ATTENDANCE_STATUSES)[number];

export const STUDENT_ATTENDANCE_PERMISSIONS = {
  VIEW: 'student.attendance.view',
  MARK: 'student.attendance.mark',
  MANAGE: 'student.attendance.manage',
} as const;
