import { EMPLOYEE_CODE_PATTERN } from '../constants/staff.constants';

export function normalizeEmployeeCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidEmployeeCode(code: string): boolean {
  return EMPLOYEE_CODE_PATTERN.test(code);
}
