import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceFeatureGuard } from '../common/features/attendance-feature.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { StudentAttendanceController } from './student-attendance.controller';
import { StudentAttendanceService } from './student-attendance.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [StudentAttendanceController],
  providers: [StudentAttendanceService, PermissionsGuard, AttendanceFeatureGuard],
  exports: [StudentAttendanceService],
})
export class StudentAttendanceModule {}
