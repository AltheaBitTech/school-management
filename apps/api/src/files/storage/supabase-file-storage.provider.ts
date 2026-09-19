import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_CONFIG_KEY, StorageConfig } from '../../config/storage.configuration';
import { FILE_ERROR_CODES } from '../constants/file.constants';
import { assertSafeStorageKey } from '../utils/storage-key.util';
import { StorageProvider } from './storage-provider.interface';

interface ResolvedSupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseBucket: string;
}

/**
 * Stores files in a private Supabase Storage bucket via the Storage REST API, using the
 * server-side service role key only (never sent to the client). Implements the same
 * StorageProvider contract as LocalFileStorageProvider so Files/Documents services and
 * controllers are unaffected by which provider is bound.
 */
@Injectable()
export class SupabaseFileStorageProvider implements StorageProvider {
  private readonly logger = new Logger(SupabaseFileStorageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async put(storageKey: string, data: Buffer): Promise<void> {
    assertSafeStorageKey(storageKey);
    const config = this.getConfig();

    const response = await fetch(this.objectUrl(config, storageKey), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: new Uint8Array(data),
    });

    if (!response.ok) {
      this.logFailure('upload', storageKey, response.status);
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to store uploaded file',
      });
    }
  }

  async get(storageKey: string): Promise<Buffer> {
    assertSafeStorageKey(storageKey);
    const config = this.getConfig();

    const response = await fetch(this.objectUrl(config, storageKey), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
    });

    if (!response.ok) {
      this.logFailure('read', storageKey, response.status);
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to read stored file',
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(storageKey: string): Promise<void> {
    assertSafeStorageKey(storageKey);
    const config = this.getConfig();

    const response = await fetch(this.objectUrl(config, storageKey), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      this.logFailure('delete', storageKey, response.status);
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_DELETE_FAILED,
        message: 'Failed to delete stored file',
      });
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    assertSafeStorageKey(storageKey);
    const config = this.getConfig();

    const response = await fetch(this.objectInfoUrl(config, storageKey), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      },
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      this.logFailure('check', storageKey, response.status);
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Failed to check stored file',
      });
    }

    return true;
  }

  private getConfig(): ResolvedSupabaseConfig {
    const config = this.configService.get<StorageConfig>(STORAGE_CONFIG_KEY);

    if (!config?.supabaseUrl || !config.supabaseServiceRoleKey || !config.supabaseBucket) {
      throw new InternalServerErrorException({
        code: FILE_ERROR_CODES.FILE_STORAGE_FAILED,
        message: 'Supabase storage provider is not configured',
      });
    }

    return {
      supabaseUrl: config.supabaseUrl,
      supabaseServiceRoleKey: config.supabaseServiceRoleKey,
      supabaseBucket: config.supabaseBucket,
    };
  }

  private encodeKey(storageKey: string): string {
    return storageKey.split('/').map(encodeURIComponent).join('/');
  }

  private objectUrl(config: ResolvedSupabaseConfig, storageKey: string): string {
    return `${config.supabaseUrl}/storage/v1/object/${config.supabaseBucket}/${this.encodeKey(storageKey)}`;
  }

  private objectInfoUrl(config: ResolvedSupabaseConfig, storageKey: string): string {
    return `${config.supabaseUrl}/storage/v1/object/info/${config.supabaseBucket}/${this.encodeKey(storageKey)}`;
  }

  private logFailure(action: string, storageKey: string, statusCode: number): void {
    this.logger.error(
      `Supabase storage ${action} failed for key ${storageKey}: HTTP ${statusCode}`,
    );
  }
}
