import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CONFIGURATION_KEY } from '../config/configuration';
import { PermissionsService } from '../permissions/permissions.service';
import { SYSTEM_PERMISSIONS } from '../permissions/constants/system-permissions';
import { PrismaService } from '../prisma/prisma.service';
import { FILE_ERROR_CODES } from './constants/file.constants';
import { FilesService } from './files.service';
import { FileStorageService } from './storage/file-storage.service';
import { LocalFileStorageProvider } from './storage/local-file-storage.provider';
import { StorageProvider } from './storage/storage-provider.interface';
import { buildStorageKey } from './utils/storage-key.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

function createMulterFile(
  originalname: string,
  buffer: Buffer,
  mimetype: string,
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as unknown as Express.Multer.File['stream'],
  };
}

class FailingPutStorageProvider implements StorageProvider {
  constructor(private readonly inner: StorageProvider) {}

  put(): Promise<void> {
    throw new InternalServerErrorException({
      code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
      message: 'Failed to store uploaded file',
    });
  }

  get(storageKey: string): Promise<Buffer> {
    return this.inner.get(storageKey);
  }

  delete(storageKey: string): Promise<void> {
    return this.inner.delete(storageKey);
  }

  exists(storageKey: string): Promise<boolean> {
    return this.inner.exists(storageKey);
  }
}

describeIfDatabase('Files integration', () => {
  let prisma: PrismaClient;
  let filesService: FilesService;
  let localProvider: LocalFileStorageProvider;
  let fileStorageService: FileStorageService;
  let permissionsService: PermissionsService;
  let permissionsGuard: PermissionsGuard;
  let tempRoot: string;
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;

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

  const pdfBuffer = Buffer.from('%PDF-1.4\n% test file\n');
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  beforeAll(async () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'campusops-files-'));
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
      data: { name: 'File School A', code: `file-a-${Date.now()}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'File School B', code: `file-b-${Date.now()}` },
    });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await prisma.user.create({
      data: { organizationId: orgAId, email: `file-user-a-${Date.now()}@example.com` },
    });
    const userB = await prisma.user.create({
      data: { organizationId: orgBId, email: `file-user-b-${Date.now()}@example.com` },
    });
    userAId = userA.id;
    userBId = userB.id;

    actorA.userId = userAId;
    actorA.organizationId = orgAId;
    actorB.userId = userBId;
    actorB.organizationId = orgBId;

    const configService = {
      get: (key: string) =>
        key === CONFIGURATION_KEY
          ? {
              fileStorageRoot: tempRoot,
            }
          : undefined,
    } as ConfigService;

    localProvider = new LocalFileStorageProvider(configService);
    fileStorageService = new FileStorageService(localProvider);
    filesService = new FilesService(prisma as unknown as PrismaService, fileStorageService);
    permissionsService = new PermissionsService(prisma as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(new Reflector(), permissionsService);
  });

  afterAll(async () => {
    await prisma.file.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await prisma.$disconnect();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('uploads supported files and persists metadata and physical storage', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('leave-form.pdf', pdfBuffer, 'application/pdf'),
    );

    expect(created.organizationId).toBe(orgAId);
    expect(created.createdById).toBe(userAId);
    expect(created.storageKey).toBe(buildStorageKey(orgAId, created.id));
    expect(await localProvider.exists(created.storageKey)).toBe(true);

    const downloaded = await filesService.download(orgAId, created.id);
    expect(downloaded.buffer.equals(pdfBuffer)).toBe(true);
  });

  it('uploads JPEG and PNG files', async () => {
    const jpeg = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('photo.jpg', jpegBuffer, 'image/jpeg'),
    );
    const png = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('badge.png', pngBuffer, 'image/png'),
    );

    expect(jpeg.mimeType).toBe('image/jpeg');
    expect(png.mimeType).toBe('image/png');
  });

  it('rejects empty and unsupported uploads', async () => {
    await expect(
      filesService.upload(orgAId, actorA, createMulterFile('empty.pdf', Buffer.alloc(0), 'application/pdf')),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      filesService.upload(
        orgAId,
        actorA,
        createMulterFile('notes.txt', Buffer.from('plain text'), 'text/plain'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sanitizes unsafe original filenames to basename metadata only', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('../../etc/passwd.pdf', pdfBuffer, 'application/pdf'),
    );

    expect(created.originalName).toBe('passwd.pdf');
    expect(created.storageKey).toBe(buildStorageKey(orgAId, created.id));
  });

  it('blocks cross-tenant download and delete without leaking ownership', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('tenant-a.pdf', pdfBuffer, 'application/pdf'),
    );

    await expect(filesService.download(orgBId, created.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(filesService.delete(orgBId, created.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(filesService.findById(orgBId, created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes authorized files and removes physical storage', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('delete-me.pdf', pdfBuffer, 'application/pdf'),
    );

    await filesService.delete(orgAId, created.id);
    expect(await localProvider.exists(created.storageKey)).toBe(false);
    await expect(filesService.findById(orgAId, created.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('denies file RBAC permissions when required codes are missing', async () => {
    const createRequest = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a-create',
        email: 'user@example.com',
      },
    };

    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce(['file.view']);

    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValueOnce(['file.create']);

    const createContext = {
      switchToHttp: () => ({ getRequest: () => createRequest }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(createContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const viewRequest = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a-view',
        email: 'user@example.com',
      },
    };

    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce(['file.create']);
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValueOnce(['file.view']);

    const viewContext = {
      switchToHttp: () => ({ getRequest: () => viewRequest }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(viewContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const deleteRequest = {
      user: {
        userId: userAId,
        organizationId: orgAId,
        sessionId: 'session-a-delete',
        email: 'user@example.com',
      },
    };

    jest.spyOn(permissionsService, 'getEffectivePermissions').mockResolvedValueOnce(['file.view']);
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValueOnce(['file.delete']);

    const deleteContext = {
      switchToHttp: () => ({ getRequest: () => deleteRequest }),
      getHandler: () => () => undefined,
      getClass: () => class TestController {},
    } as unknown as ExecutionContext;

    await expect(permissionsGuard.canActivate(deleteContext)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('does not create metadata when storage write fails', async () => {
    const failingService = new FilesService(
      prisma as unknown as PrismaService,
      new FileStorageService(new FailingPutStorageProvider(localProvider)),
    );

    const beforeCount = await prisma.file.count({ where: { organizationId: orgAId } });

    await expect(
      failingService.upload(
        orgAId,
        actorA,
        createMulterFile('broken.pdf', pdfBuffer, 'application/pdf'),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    const afterCount = await prisma.file.count({ where: { organizationId: orgAId } });
    expect(afterCount).toBe(beforeCount);
  });

  it('cleans up physical storage when metadata creation fails', async () => {
    const createSpy = jest
      .spyOn(prisma.file, 'create')
      .mockRejectedValueOnce(new Error('database unavailable'));

    const orphanRootEntriesBefore = countStoredObjects();

    await expect(
      filesService.upload(
        orgAId,
        actorA,
        createMulterFile('rollback.pdf', pdfBuffer, 'application/pdf'),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    createSpy.mockRestore();

    expect(countStoredObjects()).toBe(orphanRootEntriesBefore);
  });

  it('reports storage read failures for missing physical objects', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('missing-storage.pdf', pdfBuffer, 'application/pdf'),
    );

    await localProvider.delete(created.storageKey);

    await expect(filesService.download(orgAId, created.id)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('deletes metadata first and reports physical cleanup failures', async () => {
    const created = await filesService.upload(
      orgAId,
      actorA,
      createMulterFile('cleanup-failure.pdf', pdfBuffer, 'application/pdf'),
    );

    const deleteSpy = jest
      .spyOn(fileStorageService, 'delete')
      .mockRejectedValueOnce(
        new InternalServerErrorException({
          code: FILE_ERROR_CODES.FILE_DELETE_FAILED,
          message: 'Failed to delete stored file',
        }),
      );

    await expect(filesService.delete(orgAId, created.id)).rejects.toMatchObject({
      response: {
        code: FILE_ERROR_CODES.FILE_DELETE_FAILED,
      },
    });

    deleteSpy.mockRestore();

    await expect(filesService.findById(orgAId, created.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await localProvider.exists(created.storageKey)).toBe(true);
  });

  it('rejects arbitrary storage keys and path traversal at the provider boundary', async () => {
    await expect(localProvider.put('../escape.pdf', pdfBuffer)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await expect(
      localProvider.put(`${orgAId}/../other-org/${randomUUID()}`, pdfBuffer),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  function countStoredObjects(): number {
    let count = 0;

    for (const orgDir of readdirSync(tempRoot)) {
      const orgPath = join(tempRoot, orgDir);
      count += readdirSync(orgPath).length;
    }

    return count;
  }
});
