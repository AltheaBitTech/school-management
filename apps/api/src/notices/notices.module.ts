import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { NoticeNotificationService } from './notice-notification.service';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, NotificationsModule],
  controllers: [NoticesController],
  providers: [NoticesService, NoticeNotificationService, PermissionsGuard],
  exports: [NoticesService],
})
export class NoticesModule {}
