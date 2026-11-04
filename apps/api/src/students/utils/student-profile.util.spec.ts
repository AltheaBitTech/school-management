import { academicYearMessage, studentProfileFieldErrors } from './student-profile.util';

const validProfile = {
  studentClass: '8',
  section: 'B',
  rollNumber: '14',
  academicYear: '2025-2026',
  guardianName: 'Avinash',
  guardianPhone: '7893446784',
};

describe('student profile rules', () => {
  it('accepts a complete class, consecutive academic year, and Indian mobile', () => {
    expect(studentProfileFieldErrors(validProfile)).toEqual([]);
    expect(academicYearMessage('2025-2026')).toBeNull();
  });

  it('rejects a bare year, a long roll number, and a short phone', () => {
    const errors = studentProfileFieldErrors({
      ...validProfile,
      academicYear: '2025',
      rollNumber: '315175711097',
      guardianPhone: '12345',
    });

    expect(errors.map((error) => error.field)).toEqual([
      'rollNumber',
      'academicYear',
      'guardianPhone',
    ]);
  });

  it('rejects an academic year that skips years', () => {
    expect(academicYearMessage('2025-2030')).toMatch(/consecutive/);
  });
});
