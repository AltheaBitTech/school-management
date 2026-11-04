import { VISITOR_MOBILE_PATTERN } from '../../visitors/constants/visitor-mobile.constants';

/** School year label: 2025-2026, where the second year is the next year. */
export const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

/** Short class roll. Rejects long free-typed numbers. */
export const ROLL_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,10}$/;

export interface StudentProfileFields {
  studentClass: string;
  section: string;
  rollNumber: string;
  academicYear: string;
  guardianName: string;
  guardianPhone: string;
}

export function academicYearMessage(value: string): string | null {
  const match = ACADEMIC_YEAR_PATTERN.exec(value.trim());
  if (!match) {
    return 'Academic year must look like 2025-2026';
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) {
    return 'Academic year must cover two consecutive years, such as 2025-2026';
  }

  return null;
}

export function studentProfileFieldErrors(
  input: StudentProfileFields,
): Array<{ field: keyof StudentProfileFields; message: string }> {
  const errors: Array<{ field: keyof StudentProfileFields; message: string }> = [];
  const studentClass = input.studentClass.trim();
  const section = input.section.trim();
  const rollNumber = input.rollNumber.trim();
  const academicYear = input.academicYear.trim();
  const guardianName = input.guardianName.trim();
  const guardianPhone = input.guardianPhone.trim();

  if (!studentClass) {
    errors.push({ field: 'studentClass', message: 'Class is required' });
  } else if (studentClass.length > 20) {
    errors.push({ field: 'studentClass', message: 'Class must be 20 characters or fewer' });
  }

  if (!section) {
    errors.push({ field: 'section', message: 'Section is required' });
  } else if (section.length > 10) {
    errors.push({ field: 'section', message: 'Section must be 10 characters or fewer' });
  }

  if (!rollNumber) {
    errors.push({ field: 'rollNumber', message: 'Roll number is required' });
  } else if (!ROLL_NUMBER_PATTERN.test(rollNumber)) {
    errors.push({
      field: 'rollNumber',
      message: 'Roll number must be 1–10 letters, numbers, or hyphens',
    });
  }

  if (!academicYear) {
    errors.push({ field: 'academicYear', message: 'Academic year is required' });
  } else {
    const yearMessage = academicYearMessage(academicYear);
    if (yearMessage) {
      errors.push({ field: 'academicYear', message: yearMessage });
    }
  }

  if (!guardianName) {
    errors.push({ field: 'guardianName', message: 'Guardian name is required' });
  } else if (guardianName.length > 120) {
    errors.push({ field: 'guardianName', message: 'Guardian name must be 120 characters or fewer' });
  }

  if (!guardianPhone) {
    errors.push({ field: 'guardianPhone', message: 'Guardian phone is required' });
  } else if (!VISITOR_MOBILE_PATTERN.test(guardianPhone)) {
    errors.push({
      field: 'guardianPhone',
      message: 'Guardian phone must be a 10-digit Indian mobile number',
    });
  }

  return errors;
}
