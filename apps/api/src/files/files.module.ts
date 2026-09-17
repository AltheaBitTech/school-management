import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileStorageService } from './storage/file-storage.service';
import { LocalFileStorageProvider } from './storage/local-file-storage.provider';
import { STORAGE_PROVIDER } from './storage/storage-provider.interface';

@Module({
  imports: [PermissionsModule],
  controllers: [FilesController],
  providers: [
    LocalFileStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useExisting: LocalFileStorageProvider,
    },
    FileStorageService,
    FilesService,
  ],
  exports: [FilesService, FileStorageService],
})
export class FilesModule {}
