import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { normalizeEmail } from '../auth/utils/email.util';
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
import { ORGANIZATION_ROLE_CODES } from '../permissions/constants/system-roles';
import { getOrganizationRoleByCode } from '../roles/organization-role-seed.util';
import { normalizeDepartmentCode, isValidDepartmentCode } from '../departments/utils/department-code.util';
import { PrismaService } from '../prisma/prisma.service';
import { EMPLOYEE_CODE_PATTERN } from './constants/staff.constants';
import { isValidEmployeeCode, normalizeEmployeeCode } from './utils/employee-code.util';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';
import { StaffService } from './staff.service';
import {
  STAFF_CSV_ROLE_CODES,
  STAFF_IMPORT_COLUMNS,
  STAFF_IMPORT_GUIDE,
  STAFF_IMPORT_SAMPLE_CSV,
} from './staff-import.guide';

const REQUIRED_COLUMNS = ['firstName', 'lastName', 'email', 'employeeCode'] as const;
const ASSIGNABLE_ROLE_CODES = new Set<string>(STAFF_CSV_ROLE_CODES);
type CsvColumn = (typeof STAFF_IMPORT_COLUMNS)[number];

export interface StaffImportRowResult {
  row: number;
  status: 'imported' | 'error';
  category?: 'validation' | 'duplicate';
  column?: string;
  name?: string;
  email?: string;
  inviteUrl?: string;
  inviteExpiresAt?: string;
  employeeCode?: string;
  reason?: string;
}

export interface StaffImportResult {
  imported: number;
  skipped: number;
  duplicateCount: number;
  rows: StaffImportRowResult[];
}

export interface StaffImportPreviewRow {
  row: number;
  status: 'valid' | 'invalid' | 'duplicate';
  label: string;
  detail: string;
  employeeCode?: string;
  errors: CsvFieldError[];
}

export interface StaffImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: StaffImportPreviewRow[];
}

interface EvaluatedStaffRow {
  rowNumber: number;
  values: Record<CsvColumn, string>;
  errors: CsvFieldError[];
  duplicate: boolean;
  roleId?: string;
  departmentId?: string;
}

@Injectable()
export class StaffImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffService: StaffService,
    private readonly staffLoginProvisioningService: StaffLoginProvisioningService,
    private readonly auditService: AuditService,
  ) {}

  getSampleCsv(): string {
    return STAFF_IMPORT_SAMPLE_CSV;
  }

  getGuidePdf(): Promise<Buffer> {
    return renderImportGuidePdf(STAFF_IMPORT_GUIDE);
  }

  async previewFromCsv(
    actor: AuthenticatedUser,
    file: Express.Multer.File | undefined,
  ): Promise<StaffImportPreview> {
    const evaluated = await this.evaluateFile(actor.organizationId, file);
    const rows = evaluated.map((entry) => ({
      row: entry.rowNumber,
      status: this.previewStatus(entry),
      label: `${entry.values.firstName} ${entry.values.lastName}`.trim() || 'Unnamed staff member',
      detail: [entry.values.employeeCode, entry.values.roleCode || 'TEACHER'].filter(Boolean).join(' · '),
      employeeCode: entry.values.employeeCode || undefined,
      errors: entry.errors,
    }));
    return {
      totalRows: rows.length,
      validRows: rows.filter((row) => row.status === 'valid').length,
      invalidRows: rows.filter((row) => row.status === 'invalid').length,
      duplicateRows: rows.filter((row) => row.status === 'duplicate').length,
      rows,
    };
  }

  async importFromCsv(
    actor: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    options?: { requestId?: string },
  ): Promise<StaffImportResult> {
    const evaluated = await this.evaluateFile(actor.organizationId, file);
    const rows: StaffImportRowResult[] = [];
    let imported = 0;
    let skipped = 0;
    let duplicateCount = 0;

    for (const entry of evaluated) {
      if (entry.errors.length > 0 || !entry.roleId) {
        skipped += 1;
        if (this.isDuplicate(entry)) {
          duplicateCount += 1;
        }
        rows.push(this.errorResult(entry));
        continue;
      }

      const values = entry.values;
      try {
        const staff = await this.staffService.create(actor.organizationId, {
          employeeCode: normalizeEmployeeCode(values.employeeCode),
          firstName: values.firstName,
          lastName: values.lastName,
          email: normalizeEmail(values.email),
          designation: values.designation || undefined,
          departmentId: entry.departmentId,
          joiningDate: values.joiningDate || undefined,
          mobile: values.phone || undefined,
        });

        const provisionResult = await this.staffLoginProvisioningService.provisionLogin(
          actor,
          staff.id,
          {
            email: normalizeEmail(values.email),
            roleId: entry.roleId,
          },
          options,
        );

        imported += 1;
        rows.push({
          row: entry.rowNumber,
          status: 'imported',
          name: `${values.firstName} ${values.lastName}`.trim(),
          email: normalizeEmail(values.email),
          inviteUrl: provisionResult.inviteUrl,
          inviteExpiresAt: provisionResult.inviteExpiresAt,
          employeeCode: normalizeEmployeeCode(values.employeeCode),
        });
      } catch (error: unknown) {
        skipped += 1;
        const reason = httpErrorMessage(error, 'Failed to import row');
        const duplicate = /already registered|already exists|duplicate/i.test(reason);
        if (duplicate) {
          duplicateCount += 1;
        }
        rows.push({
          row: entry.rowNumber,
          status: 'error',
          category: duplicate ? 'duplicate' : 'validation',
          column: 'row',
          employeeCode: values.employeeCode,
          reason,
        });
      }
    }

    if (imported > 0) {
      await this.auditService.record({
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action: AUDIT_ACTIONS.STAFF_BULK_IMPORTED,
        entityType: AUDIT_ENTITY_TYPES.STAFF,
        entityId: actor.organizationId,
        requestId: options?.requestId,
        metadata: { imported, skipped, duplicateCount },
      });
    }

    return { imported, skipped, duplicateCount, rows };
  }

  private async evaluateFile(
    organizationId: string,
    file: Express.Multer.File | undefined,
  ): Promise<EvaluatedStaffRow[]> {
    assertCsvUpload(file);
    const parsedRows = parseCsv(file!.buffer.toString('utf-8'));
    const header = parsedRows[0]!;
    assertCsvHeaders(header, REQUIRED_COLUMNS, STAFF_IMPORT_COLUMNS);

    const evaluated: EvaluatedStaffRow[] = [];
    const seenCodes = new Map<string, number>();
    const seenEmails = new Map<string, number>();

    for (let index = 1; index < parsedRows.length; index += 1) {
      const { values, errors } = readCsvRow(parsedRows[index]!, header, STAFF_IMPORT_COLUMNS);
      const rowErrors = [...errors, ...(await this.validateValues(organizationId, values))];
      const role = await this.resolveRole(organizationId, values.roleCode);
      if (role.error) {
        rowErrors.push({ column: 'roleCode', message: role.error });
      }
      const department = await this.resolveDepartment(organizationId, values.departmentCode);
      if (department.error) {
        rowErrors.push({ column: 'departmentCode', message: department.error });
      }

      let duplicate = false;
      const code = values.employeeCode ? normalizeEmployeeCode(values.employeeCode) : '';
      if (code && isValidEmployeeCode(code)) {
        const firstRow = seenCodes.get(code);
        if (firstRow) {
          duplicate = true;
          rowErrors.push({
            column: 'employeeCode',
            message: `Repeated in row ${firstRow}. Only the first row with this code can be imported`,
          });
        } else {
          seenCodes.set(code, index + 1);
        }
      }

      const email = values.email ? normalizeEmail(values.email) : '';
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const firstRow = seenEmails.get(email);
        if (firstRow) {
          duplicate = true;
          rowErrors.push({
            column: 'email',
            message: `Repeated in row ${firstRow}. Only the first row with this email can be imported`,
          });
        } else {
          seenEmails.set(email, index + 1);
        }
      }

      evaluated.push({
        rowNumber: index + 1,
        values,
        errors: rowErrors,
        duplicate,
        roleId: role.roleId,
        departmentId: department.departmentId,
      });
    }

    return evaluated;
  }

  private async validateValues(
    organizationId: string,
    row: Record<CsvColumn, string>,
  ): Promise<CsvFieldError[]> {
    const errors: CsvFieldError[] = [];
    if (!row.firstName) {
      errors.push({ column: 'firstName', message: 'First name is required' });
    } else if (row.firstName.length > 80) {
      errors.push({ column: 'firstName', message: 'Use at most 80 characters' });
    }
    if (!row.lastName) {
      errors.push({ column: 'lastName', message: 'Last name is required' });
    } else if (row.lastName.length > 80) {
      errors.push({ column: 'lastName', message: 'Use at most 80 characters' });
    }
    if (!row.email) {
      errors.push({ column: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || row.email.length > 254) {
      errors.push({ column: 'email', message: 'Enter a valid email address' });
    }
    const normalizedCode = row.employeeCode ? normalizeEmployeeCode(row.employeeCode) : '';
    if (!row.employeeCode) {
      errors.push({ column: 'employeeCode', message: 'Employee code is required' });
    } else if (!isValidEmployeeCode(normalizedCode) || !EMPLOYEE_CODE_PATTERN.test(normalizedCode)) {
      errors.push({
        column: 'employeeCode',
        message: 'Use 2-32 lowercase letters, numbers, or hyphens',
      });
    }
    if (row.designation && row.designation.length > 120) {
      errors.push({ column: 'designation', message: 'Use at most 120 characters' });
    }
    if (row.joiningDate && !parseIsoDate(row.joiningDate)) {
      errors.push({ column: 'joiningDate', message: 'Use YYYY-MM-DD' });
    }
    if (row.phone && !/^[0-9+\-()\s]+$/.test(row.phone)) {
      errors.push({
        column: 'phone',
        message: 'Use digits, spaces, plus signs, hyphens, or parentheses',
      });
    } else if (row.phone.length > 20) {
      errors.push({ column: 'phone', message: 'Use at most 20 characters' });
    }

    if (
      normalizedCode &&
      isValidEmployeeCode(normalizedCode) &&
      !errors.some((error) => error.column === 'employeeCode')
    ) {
      const existingStaffByCode = await this.prisma.staff.findFirst({
        where: { organizationId, employeeCode: normalizedCode },
        select: { id: true },
      });
      if (existingStaffByCode) {
        errors.push({
          column: 'employeeCode',
          message: 'This employee code already exists in this institution and will not be updated',
        });
      }
    }

    if (row.email && !errors.some((error) => error.column === 'email')) {
      const normalizedEmail = normalizeEmail(row.email);
      const [existingStaffByEmail, existingUserByEmail] = await Promise.all([
        this.prisma.staff.findFirst({
          where: { organizationId, email: normalizedEmail },
          select: { id: true },
        }),
        this.prisma.user.findFirst({
          where: { email: normalizedEmail },
          select: { id: true },
        }),
      ]);
      if (existingStaffByEmail || existingUserByEmail) {
        errors.push({
          column: 'email',
          message: 'This email is already registered and will not create another account',
        });
      }
    }

    return errors;
  }

  private async resolveRole(
    organizationId: string,
    roleCodeRaw: string,
  ): Promise<{ roleId?: string; error?: string }> {
    const normalized = roleCodeRaw.trim().toUpperCase() || ORGANIZATION_ROLE_CODES.TEACHER;
    if (normalized === ORGANIZATION_ROLE_CODES.STUDENT) {
      return {
        error: 'STUDENT cannot be assigned from a staff CSV. Add students from the Students page',
      };
    }
    if (!ASSIGNABLE_ROLE_CODES.has(normalized)) {
      return {
        error: `Use one of ${STAFF_CSV_ROLE_CODES.join(', ')}. Platform roles cannot be assigned`,
      };
    }
    try {
      const role = await getOrganizationRoleByCode(this.prisma, organizationId, normalized);
      return { roleId: role.id };
    } catch {
      return { error: `${normalized} is not available for this institution` };
    }
  }

  private async resolveDepartment(
    organizationId: string,
    departmentCode: string,
  ): Promise<{ departmentId?: string; error?: string }> {
    if (!departmentCode) {
      return {};
    }
    const normalized = normalizeDepartmentCode(departmentCode);
    if (!isValidDepartmentCode(normalized)) {
      return { error: 'Use 2-32 lowercase letters, numbers, or hyphens' };
    }
    const department = await this.prisma.department.findFirst({
      where: { organizationId, code: normalized, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!department) {
      return { error: `${departmentCode} was not found among active departments` };
    }
    return { departmentId: department.id };
  }

  private isDuplicate(entry: EvaluatedStaffRow): boolean {
    return (
      entry.duplicate ||
      entry.errors.some((error) => /already registered|already exists/i.test(error.message))
    );
  }

  private previewStatus(entry: EvaluatedStaffRow): StaffImportPreviewRow['status'] {
    if (this.isDuplicate(entry)) {
      return 'duplicate';
    }
    return entry.errors.length > 0 ? 'invalid' : 'valid';
  }

  private errorResult(entry: EvaluatedStaffRow): StaffImportRowResult {
    return {
      row: entry.rowNumber,
      status: 'error',
      category: this.isDuplicate(entry) ? 'duplicate' : 'validation',
      column: entry.errors[0]?.column,
      employeeCode: entry.values.employeeCode || undefined,
      reason: errorText(entry.errors) || 'This row could not be imported',
    };
  }
}
