import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  DocumentOwnerType,
  DocumentType,
  PrismaClient,
  StudentStatus,
} from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CONFIGURATION_KEY } from '../config/configuration';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { FILE_ERROR_CODES } from '../files/constants/file.constants';
import { FilesService } from '../files/files.service';
import { FileStorageService } from '../files/storage/file-storage.service';
import { LocalFileStorageProvider } from '../files/storage/local-file-storage.provider';
import { StorageProvider } from '../files/storage/storage-provider.interface';
import {
  BONAFIDE_TEMPLATE_DEFINITION,
  DOCUMENT_ERROR_CODES,
} from './constants/document.constants';
import { DocumentsService } from './documents.service';
import { ensureDefaultDocumentTemplates } from './utils/document-template-seed.util';
import {
  parseDocumentTemplateContent,
  resolveTemplateText,
} from './utils/template-resolver.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

class FailingPutStorageProvider implements StorageProvider {
  put(): Promise<void> {
    throw new InternalServerErrorException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Failed to store generated file',
    });
  }

  get(): Promise<Buffer> {
    return Promise.reject(new Error('Unexpected get'));
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

describeIfDatabase('Documents integration', () => {
  let prisma: PrismaClient;
  let documentsService: DocumentsService;
  let studentsService: StudentsService;
  let filesService: FilesService;
  let configService: ConfigService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let tempRoot: string;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let studentAId: string;
  let studentBId: string;
  let inactiveStudentAId: string;

  const actorA = {
    userId: '',
    organizationId: '',
    sessionId: 'session-a',
    email: 'admin-a@example.com',
  };

  const actorB = {
    userId: '',
    organizationId: '',
    sessionId: 'session-b',
    email: 'admin-b@example.com',
  };

  beforeAll(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'campusops-documents-'));
    prisma = new PrismaClient();
    await prisma.$connect();

    for (const permission of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: permission.code },
        update: { description: permission.description },
        create: permission,
      });
    }

    const orgA = await prisma.organization.create({
      data: { name: 'Document School A', code: `doc-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Document School B', code: `doc-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `doc-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `doc-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;
    actorB.userId = userBId;
    actorB.organizationId = orgBId;

    await ensureDefaultDocumentTemplates(prisma, orgAId, userAId);
    await ensureDefaultDocumentTemplates(prisma, orgBId, userBId);

    const studentA = await prisma.student.create({
      data: {
        organizationId: orgAId,
        studentCode: 'adm-doc-a-001',
        firstName: 'Bonafide',
        lastName: 'StudentA',
        className: 'Grade 8-A',
      },
    });
    const studentB = await prisma.student.create({
      data: {
        organizationId: orgBId,
        studentCode: 'adm-doc-b-001',
        firstName: 'Bonafide',
        lastName: 'StudentB',
        className: 'Grade 9-B',
      },
    });
    const inactiveStudent = await prisma.student.create({
      data: {
        organizationId: orgAId,
        studentCode: 'adm-doc-a-inactive',
        firstName: 'Inactive',
        lastName: 'Student',
        status: StudentStatus.INACTIVE,
      },
    });

    studentAId = studentA.id;
    studentBId = studentB.id;
    inactiveStudentAId = inactiveStudent.id;

    configService = {
      get: (key: string) =>
        key === CONFIGURATION_KEY
          ? {
              fileStorageRoot: tempRoot,
            }
          : undefined,
    } as ConfigService;

    const localProvider = new LocalFileStorageProvider(configService);
    const fileStorageService = new FileStorageService(localProvider);
    filesService = new FilesService(
      prisma as unknown as PrismaService,
      fileStorageService,
      configService,
    );
    studentsService = new StudentsService(prisma as unknown as PrismaService);
    documentsService = new DocumentsService(
      prisma as unknown as PrismaService,
      studentsService,
      filesService,
    );
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.generatedDocument.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.file.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.documentTemplate.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.student.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('generates a bonafide certificate with student and organization data in the PDF', async () => {
    const generated = await documentsService.generateBonafide(orgAId, actorA, studentAId);

    expect(generated.documentType).toBe(DocumentType.BONAFIDE_CERTIFICATE);
    expect(generated.ownerType).toBe(DocumentOwnerType.STUDENT);
    expect(generated.ownerId).toBe(studentAId);
    expect(generated.file?.mimeType).toBe('application/pdf');
    expect(generated.student?.studentCode).toBe('adm-doc-a-001');

    const fileRecord = await prisma.file.findFirst({
      where: { id: generated.file!.id, organizationId: orgAId },
    });
    expect(fileRecord).not.toBeNull();

    const download = await documentsService.download(orgAId, generated.id);
    expect(download.file.id).toBe(generated.file!.id);
    expect(download.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(download.buffer.length).toBeGreaterThan(100);

    const organization = await prisma.organization.findUnique({ where: { id: orgAId } });
    const student = await prisma.student.findUnique({ where: { id: studentAId } });
    const resolved = resolveTemplateText(
      parseDocumentTemplateContent(BONAFIDE_TEMPLATE_DEFINITION.content),
      {
        student: student!,
        organization: organization!,
        generatedAt: new Date(generated.createdAt),
      },
    );
    expect(resolved.body).toContain('Bonafide StudentA');
    expect(resolved.body).toContain('adm-doc-a-001');
    expect(resolved.body).toContain('Document School A');
    expect(resolved.body).toContain('Grade 8-A');
  });

  it('rejects generation for missing student', async () => {
    await expect(
      documentsService.generateBonafide(orgAId, actorA, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects generation for inactive student', async () => {
    await expect(
      documentsService.generateBonafide(orgAId, actorA, inactiveStudentAId),
    ).rejects.toMatchObject({
      response: { code: 'STUDENT_INACTIVE' },
    });
  });

  it('rejects cross-tenant student generation', async () => {
    await expect(
      documentsService.generateBonafide(orgAId, actorA, studentBId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects cross-tenant generated document lookup and download', async () => {
    const generated = await documentsService.generateBonafide(orgAId, actorA, studentAId);

    await expect(documentsService.findById(orgBId, generated.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(documentsService.download(orgBId, generated.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists generated documents with student summary', async () => {
    const listed = await documentsService.list(orgAId, {
      page: 1,
      pageSize: 25,
      studentId: studentAId,
    });

    expect(listed.data.length).toBeGreaterThan(0);
    expect(listed.data.every((item) => item.ownerId === studentAId)).toBe(true);
    expect(listed.data[0]?.student?.firstName).toBe('Bonafide');
  });

  it('does not create generated document metadata when storage fails', async () => {
    const failingProvider = new FailingPutStorageProvider();
    const failingFilesService = new FilesService(
      prisma as unknown as PrismaService,
      new FileStorageService(failingProvider),
      configService,
    );
    const failingDocumentsService = new DocumentsService(
      prisma as unknown as PrismaService,
      studentsService,
      failingFilesService,
    );

    const beforeCount = await prisma.generatedDocument.count({ where: { organizationId: orgAId } });

    await expect(
      failingDocumentsService.generateBonafide(orgAId, actorA, studentAId),
    ).rejects.toMatchObject({
      response: { code: DOCUMENT_ERROR_CODES.DOCUMENT_GENERATION_FAILED },
    });

    const afterCount = await prisma.generatedDocument.count({ where: { organizationId: orgAId } });
    expect(afterCount).toBe(beforeCount);
  });

  it('rejects missing template for organization', async () => {
    const emptyOrg = await prisma.organization.create({
      data: { name: 'No Template Org', code: `doc-empty-${Date.now()}` },
    });
    const emptyStudent = await prisma.student.create({
      data: {
        organizationId: emptyOrg.id,
        studentCode: 'adm-empty-001',
        firstName: 'No',
        lastName: 'Template',
      },
    });

    await expect(
      documentsService.generateBonafide(emptyOrg.id, actorA, emptyStudent.id),
    ).rejects.toMatchObject({
      response: { code: DOCUMENT_ERROR_CODES.DOCUMENT_TEMPLATE_NOT_FOUND },
    });

    await prisma.student.delete({ where: { id: emptyStudent.id } });
    await prisma.organization.delete({ where: { id: emptyOrg.id } });
  });

  const documentPermissions = ['document.view', 'document.generate', 'document.download'] as const;

  it.each(documentPermissions)('denies %s when permission is missing', async (permissionCode) => {
    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce([]);

    const request = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a',
        email: 'user@example.com',
      },
    };

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue([permissionCode]);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
