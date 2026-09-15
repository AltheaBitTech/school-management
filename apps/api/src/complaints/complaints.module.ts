import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService, PermissionsGuard],
  exports: [ComplaintsService],
})
export class ComplaintsModule {}
