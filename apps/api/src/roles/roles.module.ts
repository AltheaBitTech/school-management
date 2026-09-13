import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesService } from './roles.service';

@Module({
  imports: [PermissionsModule],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
