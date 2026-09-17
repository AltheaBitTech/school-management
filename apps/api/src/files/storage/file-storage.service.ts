import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from './storage-provider.interface';

@Injectable()
export class FileStorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storageProvider: StorageProvider) {}

  put(storageKey: string, data: Buffer): Promise<void> {
    return this.storageProvider.put(storageKey, data);
  }

  get(storageKey: string): Promise<Buffer> {
    return this.storageProvider.get(storageKey);
  }

  delete(storageKey: string): Promise<void> {
    return this.storageProvider.delete(storageKey);
  }

  exists(storageKey: string): Promise<boolean> {
    return this.storageProvider.exists(storageKey);
  }
}
