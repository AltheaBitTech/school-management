import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [NoticesController],
  providers: [NoticesService, PermissionsGuard],
  exports: [NoticesService],
})
export class NoticesModule {}
