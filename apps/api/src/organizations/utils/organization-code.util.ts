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
