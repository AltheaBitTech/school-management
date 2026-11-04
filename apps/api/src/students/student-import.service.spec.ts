import { StudentImportService } from './student-import.service';
import { STUDENT_IMPORT_COLUMNS, STUDENT_IMPORT_SAMPLE_CSV } from './student-import.guide';

const importHeader = STUDENT_IMPORT_COLUMNS.join(',');
const importProfile = ',,Grade 8,A,14,Avinash,7893446784,2025-2026,';

describe('StudentImportService', () => {
  const actor = {
    userId: 'admin-1',
    organizationId: 'org-1',
    sessionId: 'session-1',
    email: 'admin@school.edu',
  };
  let service: StudentImportService;
  let studentsService: { create: jest.Mock };
  let prisma: { student: { findFirst: jest.Mock } };
  let auditService: { record: jest.Mock };

  beforeEach(() => {
    studentsService = { create: jest.fn().mockResolvedValue({ id: 'student-1' }) };
    prisma = { student: { findFirst: jest.fn().mockResolvedValue(null) } };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    service = new StudentImportService(prisma as never, studentsService as never, auditService as never);
  });

  function file(csv: string): Express.Multer.File {
    return {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
      originalname: 'students.csv',
    } as Express.Multer.File;
  }

  it('builds a PDF guide that is not a CSV', async () => {
    const pdf = await service.getGuidePdf();
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('previews the sample CSV as importable and does not save rows', async () => {
    const preview = await service.previewFromCsv(actor, file(STUDENT_IMPORT_SAMPLE_CSV));

    expect(preview.totalRows).toBe(2);
    expect(preview.validRows).toBe(2);
    expect(preview.invalidRows).toBe(0);
    expect(studentsService.create).not.toHaveBeenCalled();
  });

  it('marks an existing student code as a duplicate and still reports the other row', async () => {
    prisma.student.findFirst.mockImplementation(({ where }: { where: { studentCode?: string } }) =>
      Promise.resolve(where.studentCode === 'stu-2026-001' ? { id: 'existing' } : null),
    );
    const csv = [
      importHeader,
      `stu-2026-001,Riya,Patel${importProfile}`,
      `stu-2026-002,Arjun,Mehta${importProfile}`,
      'not a code,,,,,,,,,,',
    ].join('\n');

    const preview = await service.previewFromCsv(actor, file(csv));

    expect(preview.duplicateRows).toBe(1);
    expect(preview.validRows).toBe(1);
    expect(preview.invalidRows).toBe(1);
    expect(preview.rows[2]?.errors.map((error) => error.column)).toEqual(
      expect.arrayContaining(['studentCode', 'firstName', 'lastName']),
    );

    const result = await service.importFromCsv(actor, file(csv));
    expect(result.imported).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(studentsService.create).toHaveBeenCalledTimes(1);
  });

  it('does not import a second row that repeats a student code in the file', async () => {
    const csv = [
      importHeader,
      `stu-9,Riya,Patel${importProfile}`,
      `STU-9,Arjun,Mehta${importProfile}`,
    ].join('\n');

    const result = await service.importFromCsv(actor, file(csv));

    expect(result.imported).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.rows[1]?.category).toBe('duplicate');
    expect(result.rows[1]?.reason).toMatch(/studentCode/);
  });
});
