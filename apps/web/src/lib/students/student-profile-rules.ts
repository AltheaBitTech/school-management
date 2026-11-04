import { isValidIndiaMobile } from '@/lib/validation/india-mobile';

export const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;
export const ROLL_NUMBER_PATTERN = /^[A-Za-z0-9-]{1,10}$/;

export interface StudentProfileFormValues {
  studentClass: string;
  section: string;
  rollNumber: string;
  academicYear: string;
  guardianName: string;
  guardianPhone: string;
}

export type StudentProfileField = keyof StudentProfileFormValues;

export function academicYearMessage(value: string): string | null {
  const match = ACADEMIC_YEAR_PATTERN.exec(value.trim());
  if (!match) {
    return 'Use a school year such as 2025-2026';
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) {
    return 'The second year must be the year after the first, such as 2025-2026';
  }

  return null;
}

export function validateStudentProfile(
  input: StudentProfileFormValues,
): Partial<Record<StudentProfileField, string>> {
  const errors: Partial<Record<StudentProfileField, string>> = {};
  const studentClass = input.studentClass.trim();
  const section = input.section.trim();
  const rollNumber = input.rollNumber.trim();
  const academicYear = input.academicYear.trim();
  const guardianName = input.guardianName.trim();
  const guardianPhone = input.guardianPhone.trim();

  if (!studentClass) {
    errors.studentClass = 'Class is required';
  } else if (studentClass.length > 20) {
    errors.studentClass = 'Class must be 20 characters or fewer';
  }

  if (!section) {
    errors.section = 'Section is required';
  } else if (section.length > 10) {
    errors.section = 'Section must be 10 characters or fewer';
  }

  if (!rollNumber) {
    errors.rollNumber = 'Roll number is required';
  } else if (!ROLL_NUMBER_PATTERN.test(rollNumber)) {
    errors.rollNumber = 'Use 1–10 letters, numbers, or hyphens, such as 14';
  }

  if (!academicYear) {
    errors.academicYear = 'Academic year is required';
  } else {
    const yearMessage = academicYearMessage(academicYear);
    if (yearMessage) {
      errors.academicYear = yearMessage;
    }
  }

  if (!guardianName) {
    errors.guardianName = 'Guardian name is required';
  } else if (guardianName.length > 120) {
    errors.guardianName = 'Guardian name must be 120 characters or fewer';
  }

  if (!guardianPhone) {
    errors.guardianPhone = 'Guardian phone is required';
  } else if (!isValidIndiaMobile(guardianPhone)) {
    errors.guardianPhone = 'Enter a 10-digit mobile number (optional +91 prefix)';
  }

  return errors;
}
