import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PermissionsGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
