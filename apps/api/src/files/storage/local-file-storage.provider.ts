import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, resolve, sep } from 'path';
import { AppConfig, CONFIGURATION_KEY } from '../../config/configuration';
import { FILE_ERROR_CODES } from '../constants/file.constants';
import { assertSafeStorageKey } from '../utils/storage-key.util';
import { StorageProvider } from './storage-provider.interface';

@Injectable()
export class LocalFileStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalFileStorageProvider.name);
  private readonly rootPath: string;

  constructor(private readonly configService: ConfigService) {
    const appConfig = this.configService.get<AppConfig>(CONFIGURATION_KEY);
    this.rootPath = resolve(appConfig?.fileStorageRoot ?? 'storage/files');
  }

  getRootPath(): string {
    return this.rootPath;
  }

  async put(storageKey: string, data: Buffer): Promise<void> {
    assertSafeStorageKey(storageKey);
    const absolutePath = this.resolveAbsolutePath(storageKey);

    try {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, data);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to write file to storage key ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to store uploaded file',
      });
    }
  }

  async get(storageKey: string): Promise<Buffer> {
    assertSafeStorageKey(storageKey);
    const absolutePath = this.resolveAbsolutePath(storageKey);

    try {
      return await readFile(absolutePath);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to read file for storage key ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to read stored file',
      });
    }
  }

  async delete(storageKey: string): Promise<void> {
    assertSafeStorageKey(storageKey);
    const absolutePath = this.resolveAbsolutePath(storageKey);

    try {
      await unlink(absolutePath);
    } catch (error: unknown) {
      if (isEnoent(error)) {
        return;
      }

      this.logger.error(
        `Failed to delete file for storage key ${storageKey}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_DELETE_FAILED,
        message: 'Failed to delete stored file',
      });
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    assertSafeStorageKey(storageKey);
    const absolutePath = this.resolveAbsolutePath(storageKey);

    try {
      await readFile(absolutePath);
      return true;
    } catch (error: unknown) {
      if (isEnoent(error)) {
        return false;
      }

      throw error;
    }
  }

  private resolveAbsolutePath(storageKey: string): string {
    const absolutePath = resolve(this.rootPath, storageKey);
    const normalizedRoot = `${resolve(this.rootPath)}${sep}`;

    if (!absolutePath.startsWith(normalizedRoot)) {
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Invalid storage path',
      });
    }

    return absolutePath;
  }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
