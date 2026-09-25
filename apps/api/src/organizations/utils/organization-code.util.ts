import { InternalServerErrorException } from '@nestjs/common';
import { ORGANIZATION_CODE_PATTERN } from '../constants/organization.constants';

/**
 * Organization codes are trimmed and lowercased before persistence and login lookup.
 */
export function normalizeOrganizationCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidOrganizationCode(code: string): boolean {
  return ORGANIZATION_CODE_PATTERN.test(code);
}

export function generateOrganizationCodeCandidate(): string {
  return `school-${Math.random().toString(36).substring(2, 10)}`.toLowerCase();
}

export async function generateUniqueOrganizationCode(
  isCodeTaken: (code: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateOrganizationCodeCandidate();
    if (isValidOrganizationCode(code) && !(await isCodeTaken(code))) {
      return code;
    }
  }

  throw new InternalServerErrorException('Failed to generate a unique organization code');
}
