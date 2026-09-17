import { STUDENT_CODE_PATTERN } from '../constants/student.constants';

export function normalizeStudentCode(code: string): string {
  return code.trim().toLowerCase();
}

export function isValidStudentCode(code: string): boolean {
  return STUDENT_CODE_PATTERN.test(code);
}
