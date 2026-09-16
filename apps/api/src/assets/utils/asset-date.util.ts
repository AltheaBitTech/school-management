import { BadRequestException } from '@nestjs/common';
import { ASSET_DATE_PATTERN, ASSET_ERROR_CODES } from '../constants/asset.constants';

export function parseAssetDate(dateString: string): Date {
  if (!ASSET_DATE_PATTERN.test(dateString)) {
    throw new BadRequestException({
      code: ASSET_ERROR_CODES.INVALID_ASSET_DATE,
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
      code: ASSET_ERROR_CODES.INVALID_ASSET_DATE,
      message: 'Date is invalid',
    });
  }

  return parsed;
}

export function parseOptionalAssetDate(value?: string | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseAssetDate(value);
}

export function assertValidWarrantyDates(
  warrantyStartDate?: Date | null,
  warrantyEndDate?: Date | null,
): void {
  if (warrantyStartDate && warrantyEndDate && warrantyEndDate < warrantyStartDate) {
    throw new BadRequestException({
      code: ASSET_ERROR_CODES.INVALID_WARRANTY_DATES,
      message: 'Warranty end date cannot precede warranty start date',
    });
  }
}
