import { BadRequestException } from '@nestjs/common';
import { FEE_DATE_PATTERN, FEE_ERROR_CODES } from '../constants/fee.constants';

export function parseFeeDate(value: string, fieldName: string): Date {
  if (!FEE_DATE_PATTERN.test(value)) {
    throw new BadRequestException({
      code: FEE_ERROR_CODES.INVALID_DATE,
      message: `${fieldName} must use YYYY-MM-DD format`,
    });
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException({
      code: FEE_ERROR_CODES.INVALID_DATE,
      message: `${fieldName} is not a valid date`,
    });
  }

  return parsed;
}

export function parseOptionalFeeDate(value: string | undefined, fieldName: string): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return parseFeeDate(value, fieldName);
}

export function assertValidFeePeriod(periodStart: Date, periodEnd: Date): void {
  if (periodEnd < periodStart) {
    throw new BadRequestException({
      code: FEE_ERROR_CODES.INVALID_DATE_RANGE,
      message: 'Period end must be on or after period start',
    });
  }
}

export function formatFeeDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
