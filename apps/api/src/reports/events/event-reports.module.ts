import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { EventReportsController } from './event-reports.controller';
import { EventReportsService } from './event-reports.service';

@Module({
  imports: [PermissionsModule],
  controllers: [EventReportsController],
  providers: [EventReportsService],
  exports: [EventReportsService],
})
export class EventReportsModule {}
