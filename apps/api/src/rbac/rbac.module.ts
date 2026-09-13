import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { AuthRbacTestController, RbacController } from './rbac.controller';

@Module({
  imports: [AuthModule, PermissionsModule, RolesModule],
  controllers: [RbacController, AuthRbacTestController],
  providers: [PermissionsGuard],
})
export class RbacModule {}
