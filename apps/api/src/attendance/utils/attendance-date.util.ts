import { BadRequestException } from '@nestjs/common';
import {
  ATTENDANCE_DATE_PATTERN,
  ATTENDANCE_ERROR_CODES,
} from '../constants/attendance.constants';

/**
 * Attendance dates are stored as PostgreSQL DATE values.
 * API input uses YYYY-MM-DD calendar dates without timezone conversion.
 */
export function parseAttendanceDate(dateString: string): Date {
  if (!ATTENDANCE_DATE_PATTERN.test(dateString)) {
    throw new BadRequestException({
      code: ATTENDANCE_ERROR_CODES.INVALID_ATTENDANCE_DATE,
      message: 'Attendance date must use YYYY-MM-DD format',
    });
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException({
      code: ATTENDANCE_ERROR_CODES.INVALID_ATTENDANCE_DATE,
      message: 'Attendance date is invalid',
    });
  }

  return parsed;
}

export function formatAttendanceDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseOptionalDateTime(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: ATTENDANCE_ERROR_CODES.INVALID_CHECK_IN_OUT,
      message: 'Invalid timestamp format',
    });
  }

  return parsed;
}

export function assertValidCheckInOut(checkInAt?: Date | null, checkOutAt?: Date | null): void {
  if (checkInAt && checkOutAt && checkOutAt < checkInAt) {
    throw new BadRequestException({
      code: ATTENDANCE_ERROR_CODES.INVALID_CHECK_IN_OUT,
      message: 'Check-out time cannot be earlier than check-in time',
    });
  }
}
