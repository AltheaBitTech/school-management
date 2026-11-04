import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { VisitorsController } from './visitors.controller';
import { VisitorNotificationService } from './visitor-notification.service';
import { VisitorsService } from './visitors.service';

@Module({
  imports: [PermissionsModule, NotificationsModule],
  controllers: [VisitorsController],
  providers: [VisitorsService, VisitorNotificationService],
  exports: [VisitorsService],
})
export class VisitorsModule {}
