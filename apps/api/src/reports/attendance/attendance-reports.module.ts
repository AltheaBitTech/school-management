import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { AttendanceReportsController } from './attendance-reports.controller';
import { AttendanceReportsService } from './attendance-reports.service';

@Module({
  imports: [PermissionsModule],
  controllers: [AttendanceReportsController],
  providers: [AttendanceReportsService],
  exports: [AttendanceReportsService],
})
export class AttendanceReportsModule {}
