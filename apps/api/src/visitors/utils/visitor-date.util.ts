import { BadRequestException } from '@nestjs/common';
import { VISITOR_DATE_PATTERN, VISITOR_ERROR_CODES } from '../constants/visitor.constants';

export function parseVisitorDate(dateString: string): Date {
  if (!VISITOR_DATE_PATTERN.test(dateString)) {
    throw new BadRequestException({
      code: VISITOR_ERROR_CODES.INVALID_VISITOR_DATE,
      message: 'Date must use YYYY-MM-DD format',
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
      code: VISITOR_ERROR_CODES.INVALID_VISITOR_DATE,
      message: 'Date is invalid',
    });
  }

  return parsed;
}

export function buildCheckInDateRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export function buildCheckInEndExclusive(date: Date): Date {
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}
