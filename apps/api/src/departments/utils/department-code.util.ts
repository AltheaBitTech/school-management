import { DEPARTMENT_CODE_PATTERN } from '../constants/department.constants';

export function normalizeDepartmentCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidDepartmentCode(code: string): boolean {
  return DEPARTMENT_CODE_PATTERN.test(code);
}
