export function buildStudentClassName(input: {
  className?: string | null;
  studentClass?: string | null;
  section?: string | null;
}): string | null {
  if (input.className?.trim()) {
    return input.className.trim();
  }

  const studentClass = input.studentClass?.trim();
  const section = input.section?.trim();

  if (studentClass && section) {
    return `${studentClass} - Section ${section}`;
  }

  if (studentClass) {
    return studentClass;
  }

  return null;
}
