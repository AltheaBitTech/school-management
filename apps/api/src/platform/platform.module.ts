import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [PermissionsModule],
  controllers: [PlatformController],
  providers: [PlatformService, PermissionsGuard],
  exports: [PlatformService],
})
export class PlatformModule {}
