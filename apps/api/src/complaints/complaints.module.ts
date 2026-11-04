import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ComplaintNotificationService } from './complaint-notification.service';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, NotificationsModule, FilesModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, ComplaintNotificationService, PermissionsGuard],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
