import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PermissionsGuard],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
