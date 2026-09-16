import { BadRequestException } from '@nestjs/common';
import { ASSET_ERROR_CODES } from '../constants/asset.constants';

export function assertTrimmedNonEmpty(value: string, fieldLabel: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new BadRequestException({
      code: ASSET_ERROR_CODES.ASSET_VALIDATION_FAILED,
      message: `${fieldLabel} must not be empty or whitespace only`,
    });
  }

  return trimmed;
}
