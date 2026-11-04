import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import {
  assertCsvHeaders,
  assertCsvUpload,
  CsvFieldError,
  errorText,
  httpErrorMessage,
  parseCsv,
  parseIsoDate,
  readCsvRow,
} from '../common/utils/csv-import.util';
import { renderImportGuidePdf } from '../common/utils/import-guide-pdf.util';
import { PrismaService } from '../prisma/prisma.service';
import { isValidStudentCode, normalizeStudentCode } from './utils/student-code.util';
import { studentProfileFieldErrors } from './utils/student-profile.util';
import { StudentsService } from './students.service';
import {
  STUDENT_IMPORT_COLUMNS,
  STUDENT_IMPORT_GUIDE,
  STUDENT_IMPORT_SAMPLE_CSV,
} from './student-import.guide';

const REQUIRED_COLUMNS = ['studentCode', 'firstName', 'lastName'] as const;
type CsvColumn = (typeof STUDENT_IMPORT_COLUMNS)[number];

export interface StudentImportRowResult {
  row: number;
  status: 'imported' | 'error';
  category?: 'validation' | 'duplicate';
  column?: string;
  studentCode?: string;
  name?: string;
  reason?: string;
}

export interface StudentImportResult {
  imported: number;
  skipped: number;
  duplicateCount: number;
  rows: StudentImportRowResult[];
}

export interface StudentImportPreviewRow {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  label: string;
  detail: string;
  studentCode?: string;
  errors: CsvFieldError[];
}

export interface StudentImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: StudentImportPreviewRow[];
}

interface EvaluatedStudentRow {
  rowNumber: number;
  values: Record<CsvColumn, string>;
  errors: CsvFieldError[];
  duplicate: boolean;
}

@Injectable()
export class StudentImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly auditService: AuditService,
  ) {}

  getSampleCsv(): string {
    return STUDENT_IMPORT_SAMPLE_CSV;
  }

  getGuidePdf(): Promise<Buffer> {
    return renderImportGuidePdf(STUDENT_IMPORT_GUIDE);
  }

  async previewFromCsv(
    actor: AuthenticatedUser,
    file: Express.Multer.File | undefined,
  ): Promise<StudentImportPreview> {
    const evaluated = await this.evaluateFile(actor.organizationId, file);
    return this.toPreview(evaluated);
  }

  async importFromCsv(
    actor: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    options?: { requestId?: string },
  ): Promise<StudentImportResult> {
    const evaluated = await this.evaluateFile(actor.organizationId, file);
    const rows: StudentImportRowResult[] = [];
    let imported = 0;
    let skipped = 0;
    let duplicateCount = 0;

    for (const entry of evaluated) {
      if (entry.errors.length > 0 || entry.duplicate) {
        skipped += 1;
        if (this.isDuplicate(entry)) {
          duplicateCount += 1;
        }
        rows.push(this.errorResult(entry));
        continue;
      }

      const values = entry.values;
      try {
        await this.studentsService.create(actor.organizationId, {
          studentCode: values.studentCode,
          firstName: values.firstName,
          lastName: values.lastName,
          displayName: values.displayName || undefined,
          studentClass: values.studentClass,
          section: values.section,
          rollNumber: values.rollNumber,
          guardianName: values.guardianName,
          guardianPhone: values.guardianPhone,
          academicYear: values.academicYear,
          dateOfBirth: values.dateOfBirth || undefined,
        });
        imported += 1;
        rows.push({
          row: entry.rowNumber,
          status: 'imported',
          studentCode: normalizeStudentCode(values.studentCode),
          name: `${values.firstName} ${values.lastName}`.trim(),
        });
      } catch (error: unknown) {
        skipped += 1;
        const reason = httpErrorMessage(error, 'Import failed');
        const duplicate = /already exists|duplicate/i.test(reason);
        if (duplicate) {
          duplicateCount += 1;
        }
        rows.push({
          row: entry.rowNumber,
          status: 'error',
          category: duplicate ? 'duplicate' : 'validation',
          studentCode: values.studentCode,
          name: `${values.firstName} ${values.lastName}`.trim(),
          reason,
        });
      }
    }

    if (imported > 0) {
      await this.auditService.record({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: AUDIT_ACTIONS.STUDENT_BULK_IMPORTED,
        entityType: AUDIT_ENTITY_TYPES.STUDENT,
        entityId: actor.organizationId,
        requestId: options?.requestId,
        metadata: { bulkImport: true, imported, skipped, duplicateCount },
      });
    }

    return { imported, skipped, duplicateCount, rows };
  }

  private async evaluateFile(
    organizationId: string,
    file: Express.Multer.File | undefined,
  ): Promise<EvaluatedStudentRow[]> {
    assertCsvUpload(file);
    const parsedRows = parseCsv(file!.buffer.toString('utf-8'));
    const header = parsedRows[0]!;
    assertCsvHeaders(header, REQUIRED_COLUMNS, STUDENT_IMPORT_COLUMNS);

    const evaluated: EvaluatedStudentRow[] = [];
    const seenCodes = new Map<string, number>();

    for (let index = 1; index < parsedRows.length; index += 1) {
      const cells = parsedRows[index]!;
      const { values, errors } = readCsvRow(cells, header, STUDENT_IMPORT_COLUMNS);
      const rowErrors = [...errors, ...(await this.validateValues(organizationId, values))];
      const normalizedCode = values.studentCode ? normalizeStudentCode(values.studentCode) : '';
      let duplicate = false;
      if (normalizedCode) {
        const firstRow = seenCodes.get(normalizedCode);
        if (firstRow) {
          duplicate = true;
          rowErrors.push({
            column: 'studentCode',
            message: `Repeated in row ${firstRow}. Only the first row with this code can be imported`,
          });
        } else {
          seenCodes.set(normalizedCode, index + 1);
        }
      }
      evaluated.push({
        rowNumber: index + 1,
        values,
        errors: rowErrors,
        duplicate,
      });
    }

    return evaluated;
  }

  private async validateValues(
    organizationId: string,
    values: Record<CsvColumn, string>,
  ): Promise<CsvFieldError[]> {
    const errors: CsvFieldError[] = [];
    const code = values.studentCode ? normalizeStudentCode(values.studentCode) : '';

    if (!values.studentCode) {
      errors.push({ column: 'studentCode', message: 'Student code is required' });
    } else if (!isValidStudentCode(code)) {
      errors.push({
        column: 'studentCode',
        message: 'Use 2-32 letters, numbers, or hyphens',
      });
    }

    if (!values.firstName) {
      errors.push({ column: 'firstName', message: 'First name is required' });
    } else if (values.firstName.length > 100) {
      errors.push({ column: 'firstName', message: 'Use at most 100 characters' });
    }

    if (!values.lastName) {
      errors.push({ column: 'lastName', message: 'Last name is required' });
    } else if (values.lastName.length > 100) {
      errors.push({ column: 'lastName', message: 'Use at most 100 characters' });
    }

    this.maxLength(errors, 'displayName', values.displayName, 200);

    for (const profileError of studentProfileFieldErrors({
      studentClass: values.studentClass,
      section: values.section,
      rollNumber: values.rollNumber,
      academicYear: values.academicYear,
      guardianName: values.guardianName,
      guardianPhone: values.guardianPhone,
    })) {
      errors.push({ column: profileError.field, message: profileError.message });
    }

    if (values.dateOfBirth) {
      if (!parseIsoDate(values.dateOfBirth)) {
        errors.push({ column: 'dateOfBirth', message: 'Use YYYY-MM-DD' });
      } else if (values.dateOfBirth > new Date().toISOString().slice(0, 10)) {
        errors.push({ column: 'dateOfBirth', message: 'Date of birth cannot be in the future' });
      }
    }

    if (code && isValidStudentCode(code) && !errors.some((error) => error.column === 'studentCode')) {
      const existing = await this.prisma.student.findFirst({
        where: { organizationId, studentCode: code },
        select: { id: true },
      });
      if (existing) {
        errors.push({
          column: 'studentCode',
          message: 'This student code already exists in this school and will not be updated',
        });
      }
    }

    return errors;
  }

  private maxLength(errors: CsvFieldError[], column: CsvColumn, value: string, max: number): void {
    if (value && value.length > max) {
      errors.push({ column, message: `Use at most ${max} characters` });
    }
  }

  private toPreview(evaluated: EvaluatedStudentRow[]): StudentImportPreview {
    const rows = evaluated.map((entry) => {
      const status = this.previewStatus(entry);
      return {
        row: entry.rowNumber,
        status,
        label: `${entry.values.firstName} ${entry.values.lastName}`.trim() || 'Unnamed student',
        detail: [entry.values.studentClass, entry.values.section].filter(Boolean).join(' · '),
        studentCode: entry.values.studentCode || undefined,
        errors: entry.errors,
      };
    });
    return this.counts(rows);
  }

  private isDuplicate(entry: EvaluatedStudentRow): boolean {
    return (
      entry.duplicate || entry.errors.some((error) => /already exists/i.test(error.message))
    );
  }

  private previewStatus(entry: EvaluatedStudentRow): StudentImportPreviewRow['status'] {
    if (this.isDuplicate(entry)) {
      return 'duplicate';
    }
    return entry.errors.length > 0 ? 'invalid' : 'valid';
  }

  private counts(rows: StudentImportPreviewRow[]): StudentImportPreview {
    return {
      totalRows: rows.length,
      validRows: rows.filter((row) => row.status === 'valid').length,
      invalidRows: rows.filter((row) => row.status === 'invalid').length,
      duplicateRows: rows.filter((row) => row.status === 'duplicate').length,
      rows,
    };
  }

  private errorResult(entry: EvaluatedStudentRow): StudentImportRowResult {
    const duplicate = this.isDuplicate(entry);
    return {
      row: entry.rowNumber,
      status: 'error',
      category: duplicate ? 'duplicate' : 'validation',
      column: entry.errors[0]?.column,
      studentCode: entry.values.studentCode || undefined,
      name: `${entry.values.firstName} ${entry.values.lastName}`.trim() || undefined,
      reason: errorText(entry.errors),
    };
  }
}
