import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { LeaveModule } from '../leave/leave.module';
import { StaffContextService } from './staff-context.service';
import { StaffSelfController } from './staff-self.controller';
import { StaffSelfService } from './staff-self.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    PermissionsModule,
    AttendanceModule,
    LeaveModule,
    forwardRef(() => ApprovalsModule),
  ],
  controllers: [StaffSelfController],
  providers: [StaffContextService, StaffSelfService, PermissionsGuard],
  exports: [StaffContextService, StaffSelfService],
})
export class StaffSelfModule {}
