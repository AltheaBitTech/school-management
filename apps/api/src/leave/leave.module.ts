import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import {
  LeaveBalancesController,
  LeaveRequestsController,
  LeaveTypesController,
} from './leave.controller';
import { LeaveApprovalIntegrationService } from './leave-approval-integration.service';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveTypesService } from './leave-types.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, forwardRef(() => ApprovalsModule)],
  controllers: [LeaveTypesController, LeaveBalancesController, LeaveRequestsController],
  providers: [
    LeaveTypesService,
    LeaveBalancesService,
    LeaveRequestsService,
    LeaveApprovalIntegrationService,
    PermissionsGuard,
  ],
  exports: [
    LeaveTypesService,
    LeaveBalancesService,
    LeaveRequestsService,
    LeaveApprovalIntegrationService,
  ],
})
export class LeaveModule {}
