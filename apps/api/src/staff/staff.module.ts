import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DepartmentsModule } from '../departments/departments.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { StaffController } from './staff.controller';
import { StaffLoginProvisioningService } from './staff-login-provisioning.service';
import { StaffService } from './staff.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    PermissionsModule,
    DepartmentsModule,
    RolesModule,
    AuditModule,
  ],
  controllers: [StaffController],
  providers: [StaffService, StaffLoginProvisioningService, PermissionsGuard],
  exports: [StaffService],
})
export class StaffModule {}
