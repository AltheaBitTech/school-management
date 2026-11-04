import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { StaffImportService } from './staff-import.service';
import { STAFF_IMPORT_SAMPLE_CSV } from './staff-import.guide';

describe('StaffImportService', () => {
  let service: StaffImportService;
  let staffService: { create: jest.Mock };
  let staffLoginProvisioningService: { provisionLogin: jest.Mock };
  let auditService: { record: jest.Mock };
  let prisma: {
    department: { findFirst: jest.Mock };
    staff: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    role: { findUnique: jest.Mock };
  };

  const actor = {
    userId: 'admin-1',
    organizationId: 'org-1',
    sessionId: 'session-1',
    email: 'admin@school.edu',
  };

  beforeEach(() => {
    staffService = { create: jest.fn() };
    staffLoginProvisioningService = { provisionLogin: jest.fn() };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      department: { findFirst: jest.fn() },
      staff: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'role-teacher', code: 'TEACHER' }),
      },
    };

    service = new StaffImportService(
      prisma as never,
      staffService as never,
      staffLoginProvisioningService as never,
      auditService as never,
    );
  });

  it('imports the downloadable sample CSV when those people are new', async () => {
    staffService.create.mockImplementation(async (_organizationId: string, dto: { employeeCode: string }) => ({
      id: `staff-${dto.employeeCode}`,
      firstName: 'Sample',
      lastName: 'Staff',
    }));
    staffLoginProvisioningService.provisionLogin.mockResolvedValue({
      inviteUrl: 'http://localhost/invite',
      inviteExpiresAt: '2026-09-30T00:00:00.000Z',
    });

    const sampleFile = {
      buffer: Buffer.from(STAFF_IMPORT_SAMPLE_CSV),
      mimetype: 'text/csv',
      size: STAFF_IMPORT_SAMPLE_CSV.length,
      originalname: 'campusops-staff-import-sample.csv',
    } as Express.Multer.File;

    const preview = await service.previewFromCsv(actor, sampleFile);
    expect(preview.validRows).toBe(2);
    expect(preview.invalidRows).toBe(0);
    expect(staffService.create).not.toHaveBeenCalled();

    const result = await service.importFromCsv(actor, sampleFile);
    expect(result.imported).toBe(2);
    expect(result.duplicateCount).toBe(0);
    expect(staffLoginProvisioningService.provisionLogin).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported file types', async () => {
    await expect(
      service.importFromCsv(actor, {
        buffer: Buffer.from('firstName,lastName,email,employeeCode\nA,B,a@x.com,emp-1'),
        mimetype: 'application/pdf',
        size: 10,
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('imports valid rows and returns invite links', async () => {
    staffService.create.mockResolvedValue({
      id: 'staff-1',
      firstName: 'John',
      lastName: 'Smith',
    });
    staffLoginProvisioningService.provisionLogin.mockResolvedValue({
      inviteUrl: 'http://localhost:3000/reset-password?token=abc&isInvite=true',
      inviteExpiresAt: '2026-09-30T00:00:00.000Z',
    });

    const csv = [
      'firstName,lastName,email,employeeCode',
      'John,Smith,john@school.edu,emp-001',
    ].join('\n');

    const result = await service.importFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
    } as Express.Multer.File);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.rows[0]).toMatchObject({
      status: 'imported',
      email: 'john@school.edu',
      inviteUrl: expect.stringContaining('isInvite=true'),
    });
    expect(auditService.record).toHaveBeenCalled();
  });

  it('uses roleCode from CSV when provisioning login', async () => {
    prisma.role.findUnique.mockImplementation(({ where }: { where: { organizationId_code?: { code: string } } }) => {
      const code = where.organizationId_code?.code;
      if (code === 'RECEPTIONIST') {
        return Promise.resolve({ id: 'role-receptionist', code: 'RECEPTIONIST' });
      }
      return Promise.resolve({ id: 'role-teacher', code: 'TEACHER' });
    });

    staffService.create.mockResolvedValue({ id: 'staff-2', firstName: 'Jane', lastName: 'Doe' });
    staffLoginProvisioningService.provisionLogin.mockResolvedValue({
      inviteUrl: 'http://localhost/invite',
      inviteExpiresAt: '2026-09-30T00:00:00.000Z',
    });

    const csv = [
      'firstName,lastName,email,employeeCode,roleCode',
      'Jane,Doe,jane@school.edu,emp-002,RECEPTIONIST',
    ].join('\n');

    await service.importFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
    } as Express.Multer.File);

    expect(staffLoginProvisioningService.provisionLogin).toHaveBeenCalledWith(
      actor,
      'staff-2',
      expect.objectContaining({ roleId: 'role-receptionist' }),
      undefined,
    );
  });

  it('rejects STUDENT roleCode in CSV', async () => {
    const csv = [
      'firstName,lastName,email,employeeCode,roleCode',
      'Bad,Row,bad@school.edu,emp-099,STUDENT',
    ].join('\n');

    const result = await service.importFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
    } as Express.Multer.File);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.rows[0]?.reason).toMatch(/STUDENT/i);
  });

  it('previews rows without creating staff or users', async () => {
    const csv = [
      'firstName,lastName,email,employeeCode,roleCode',
      'Jane,Doe,jane@school.edu,emp-002,SAAS_SUPER_ADMIN',
    ].join('\n');

    const preview = await service.previewFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
      originalname: 'staff.csv',
    } as Express.Multer.File);

    expect(preview.validRows).toBe(0);
    expect(preview.rows[0]?.errors[0]?.column).toBe('roleCode');
    expect(staffService.create).not.toHaveBeenCalled();
    expect(staffLoginProvisioningService.provisionLogin).not.toHaveBeenCalled();
  });

  it('imports the first copy of an employee code and reports the repeat as a duplicate', async () => {
    staffService.create.mockResolvedValue({ id: 'staff-3', firstName: 'Ann', lastName: 'Lee' });
    staffLoginProvisioningService.provisionLogin.mockResolvedValue({
      inviteUrl: 'http://localhost/invite',
      inviteExpiresAt: '2026-09-30T00:00:00.000Z',
    });
    const csv = [
      'firstName,lastName,email,employeeCode',
      'Ann,Lee,ann@school.edu,emp-003',
      'Ann,Lee,ann.other@school.edu,EMP-003',
    ].join('\n');

    const result = await service.importFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
      originalname: 'staff.csv',
    } as Express.Multer.File);

    expect(result.imported).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(staffService.create).toHaveBeenCalledTimes(1);
    expect(result.rows[1]?.reason).not.toMatch(/ann@school.edu/);
  });

  it('skips rows with missing email', async () => {
    const csv = [
      'firstName,lastName,email,employeeCode',
      'Jane,Doe,,emp-002',
    ].join('\n');

    const result = await service.importFromCsv(actor, {
      buffer: Buffer.from(csv),
      mimetype: 'text/csv',
      size: csv.length,
    } as Express.Multer.File);

    expect(result.imported).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.rows[0]?.reason).toMatch(/email is required/i);
  });
});
