import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { StaffModule } from '../staff/staff.module';
import { StudentsModule } from '../students/students.module';
import { VisitorsModule } from '../visitors/visitors.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentNotificationService } from './document-notification.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    PermissionsModule,
    FilesModule,
    StudentsModule,
    StaffModule,
    VisitorsModule,
    NotificationsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentNotificationService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
