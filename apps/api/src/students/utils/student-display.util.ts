import { Student } from '@prisma/client';

export function getStudentDisplayName(student: Pick<Student, 'firstName' | 'lastName' | 'displayName'>): string {
  if (student.displayName?.trim()) {
    return student.displayName.trim();
  }

  return `${student.firstName} ${student.lastName}`.trim();
}
