import { Module, forwardRef } from '@nestjs/common';
import { ApprovalsModule } from '../approvals/approvals.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { OperationalRequestsController } from './operational-requests.controller';
import { OperationalRequestsService } from './operational-requests.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, ApprovalsModule],
  controllers: [OperationalRequestsController],
  providers: [OperationalRequestsService, PermissionsGuard],
})
export class OperationalRequestsModule {}
