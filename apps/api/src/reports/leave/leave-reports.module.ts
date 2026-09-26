import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { LeaveReportsController } from './leave-reports.controller';
import { LeaveReportsService } from './leave-reports.service';

@Module({
  imports: [PermissionsModule],
  controllers: [LeaveReportsController],
  providers: [LeaveReportsService],
  exports: [LeaveReportsService],
})
export class LeaveReportsModule {}
