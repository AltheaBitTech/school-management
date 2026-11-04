import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { AttendanceFeatureGuard } from '../../common/features/attendance-feature.guard';
import { AttendanceReportsController } from './attendance-reports.controller';
import { AttendanceReportsService } from './attendance-reports.service';

@Module({
  imports: [PermissionsModule],
  controllers: [AttendanceReportsController],
  providers: [AttendanceReportsService, AttendanceFeatureGuard],
  exports: [AttendanceReportsService],
})
export class AttendanceReportsModule {}
