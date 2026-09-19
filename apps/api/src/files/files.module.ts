import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PermissionsModule } from '../permissions/permissions.module';
import { STORAGE_CONFIG_KEY, StorageConfig, StorageProviderType } from '../config/storage.configuration';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileStorageService } from './storage/file-storage.service';
import { LocalFileStorageProvider } from './storage/local-file-storage.provider';
import { SupabaseFileStorageProvider } from './storage/supabase-file-storage.provider';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';

@Module({
  imports: [PermissionsModule],
  controllers: [FilesController],
  providers: [
    LocalFileStorageProvider,
    SupabaseFileStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (
        configService: ConfigService,
        localProvider: LocalFileStorageProvider,
        supabaseProvider: SupabaseFileStorageProvider,
      ) => {
        const storageConfig = configService.get<StorageConfig>(STORAGE_CONFIG_KEY);
        return storageConfig?.provider === StorageProviderType.Supabase
          ? supabaseProvider
          : localProvider;
      },
      inject: [ConfigService, LocalFileStorageProvider, SupabaseFileStorageProvider],
    },
    FileStorageService,
    FilesService,
  ],
  exports: [FilesService, FileStorageService],
})
export class FilesModule {}
