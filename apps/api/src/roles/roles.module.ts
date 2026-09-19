import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesService } from './roles.service';

@Module({
  imports: [PermissionsModule, AuditModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
