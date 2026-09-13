import { Decimal } from '@prisma/client/runtime/library';
import { LeaveBalance } from '@prisma/client';
import {
  formatAttendanceDate,
  parseAttendanceDate,
} from '../../attendance/utils/attendance-date.util';

export { formatAttendanceDate as formatLeaveDate, parseAttendanceDate as parseLeaveDate };

export function calculateInclusiveCalendarDays(startDate: Date, endDate: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const dayCount =
    Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1;
  return dayCount;
}

export function calculateLeaveDuration(input: {
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
}): number {
  if (input.isHalfDay) {
    return 0.5;
  }

  return calculateInclusiveCalendarDays(input.startDate, input.endDate);
}

export function decimalToNumber(value: Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

export function calculateAvailableBalance(balance: LeaveBalance): number {
  return (
    decimalToNumber(balance.openingBalance) +
    decimalToNumber(balance.allocatedAmount) +
    decimalToNumber(balance.adjustmentAmount) -
    decimalToNumber(balance.usedAmount) -
    decimalToNumber(balance.pendingAmount)
  );
}

export function normalizeLeaveTypeCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidLeaveTypeCode(code: string): boolean {
  return /^[a-z0-9-]{2,32}$/.test(code);
}

export function datesOverlap(
  existingStart: Date,
  existingEnd: Date,
  requestedStart: Date,
  requestedEnd: Date,
): boolean {
  return existingStart <= requestedEnd && existingEnd >= requestedStart;
}
