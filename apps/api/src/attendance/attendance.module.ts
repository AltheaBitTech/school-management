import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AttendanceFeatureGuard } from '../common/features/attendance-feature.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, PermissionsGuard, AttendanceFeatureGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
