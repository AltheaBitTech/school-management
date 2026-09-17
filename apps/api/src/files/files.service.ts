import { createHash, randomUUID } from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { File } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  FILE_ERROR_CODES,
  LOCAL_STORAGE_PROVIDER,
} from './constants/file.constants';
import { FileStorageService } from './storage/file-storage.service';
import { FileResponseDto } from './dto/file-response.dto';
import { validateUploadBuffer } from './utils/file-validation.util';
import { extractExtension, sanitizeOriginalName } from './utils/filename.util';
import { buildStorageKey } from './utils/storage-key.util';

export interface FileDownloadPayload {
  file: File;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async storeBuffer(
    organizationId: string,
    actor: AuthenticatedUser,
    buffer: Buffer,
    originalName: string,
  ): Promise<File> {
    const validated = validateUploadBuffer(buffer, 'application/pdf');
    const sanitizedOriginalName = sanitizeOriginalName(originalName);
    const fileId = randomUUID();
    const storageKey = buildStorageKey(organizationId, fileId);
    const checksum = createHash('sha256').update(validated.buffer).digest('hex');
    const extension = extractExtension(sanitizedOriginalName);

    try {
      await this.fileStorageService.put(storageKey, validated.buffer);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Unexpected storage failure for ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to store generated file',
      });
    }

    try {
      return await this.prisma.file.create({
        data: {
          id: fileId,
          organizationId,
          originalName: sanitizedOriginalName,
          storageKey,
          mimeType: validated.mimeType,
          size: validated.size,
          checksum,
          extension,
          storageProvider: LOCAL_STORAGE_PROVIDER,
          createdById: actor.userId,
        },
      });
    } catch (error: unknown) {
      await this.bestEffortDelete(storageKey);
      this.logger.error(
        `Failed to persist generated file metadata for ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to persist generated file metadata',
      });
    }
  }

  async upload(
    organizationId: string,
    actor: AuthenticatedUser,
    upload: Express.Multer.File | undefined,
  ): Promise<File> {
    const validated = validateUploadBuffer(upload?.buffer, upload?.mimetype);
    const originalName = sanitizeOriginalName(upload?.originalname ?? 'upload.bin');
    const fileId = randomUUID();
    const storageKey = buildStorageKey(organizationId, fileId);
    const checksum = createHash('sha256').update(validated.buffer).digest('hex');
    const extension = extractExtension(originalName);

    try {
      await this.fileStorageService.put(storageKey, validated.buffer);
    } catch (error: unknown) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Unexpected storage failure for ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to store uploaded file',
      });
    }

    try {
      return await this.prisma.file.create({
        data: {
          id: fileId,
          organizationId,
          originalName,
          storageKey,
          mimeType: validated.mimeType,
          size: validated.size,
          checksum,
          extension,
          storageProvider: LOCAL_STORAGE_PROVIDER,
          createdById: actor.userId,
        },
      });
    } catch (error: unknown) {
      await this.bestEffortDelete(storageKey);
      this.logger.error(
        `Failed to persist file metadata for ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to persist uploaded file metadata',
      });
    }
  }

  async download(organizationId: string, fileId: string): Promise<FileDownloadPayload> {
    const file = await this.findById(organizationId, fileId);
    const buffer = await this.fileStorageService.get(file.storageKey);
    return { file, buffer };
  }

  async delete(organizationId: string, fileId: string): Promise<void> {
    const file = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.file.findFirst({
        where: { id: fileId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException({
          code: FILE_ERROR_CODES.FILE_NOT_FOUND,
          message: 'File not found',
        });
      }

      await tx.file.delete({
        where: { id: existing.id },
      });

      return existing;
    });

    try {
      await this.fileStorageService.delete(file.storageKey);
    } catch (error: unknown) {
      this.logger.error(
        `Physical delete failed after metadata removal for file ${file.id} (${file.storageKey})`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_DELETE_FAILED,
        message: 'File metadata was deleted but physical storage cleanup failed',
      });
    }
  }

  async findById(organizationId: string, fileId: string): Promise<File> {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId },
    });

    if (!file) {
      throw new NotFoundException({
        code: FILE_ERROR_CODES.FILE_NOT_FOUND,
        message: 'File not found',
      });
    }

    return file;
  }

  toDto(file: File): FileResponseDto {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      checksum: file.checksum,
      extension: file.extension,
      createdAt: file.createdAt.toISOString(),
    };
  }

  private async bestEffortDelete(storageKey: string): Promise<void> {
    try {
      await this.fileStorageService.delete(storageKey);
    } catch (error: unknown) {
      this.logger.error(
        `Best-effort cleanup failed for orphaned storage object ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
