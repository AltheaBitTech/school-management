import { Module } from '@nestjs/common';
import { PermissionsModule } from '../../permissions/permissions.module';
import { FeesReportsController } from './fees-reports.controller';
import { FeesReportsService } from './fees-reports.service';

@Module({
  imports: [PermissionsModule],
  controllers: [FeesReportsController],
  providers: [FeesReportsService],
  exports: [FeesReportsService],
})
export class FeesReportsModule {}
