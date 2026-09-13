import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DepartmentsModule } from '../departments/departments.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, DepartmentsModule],
  controllers: [StaffController],
  providers: [StaffService, PermissionsGuard],
  exports: [StaffService],
})
export class StaffModule {}
