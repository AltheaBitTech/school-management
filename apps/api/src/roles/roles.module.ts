import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesController } from './roles.controller';
import { RoleManagementService } from './role-management.service';
import { RolesService } from './roles.service';

@Module({
  imports: [PermissionsModule, AuditModule, forwardRef(() => AuthModule)],
  controllers: [RolesController],
  providers: [RolesService, RoleManagementService, PermissionsGuard],
  exports: [RolesService],
})
export class RolesModule {}
