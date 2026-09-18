import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { LeaveModule } from '../leave/leave.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ApprovalActionsService } from './approval-actions.service';
import { ApprovalEntityIntegrationService } from './approval-entity-integration.service';
import { ApprovalRequestsService } from './approval-requests.service';
import { ApprovalWorkflowsService } from './approval-workflows.service';
import { ApprovalsController, ApprovalWorkflowsController } from './approvals.controller';
import { ApproverResolutionService } from './approver-resolution.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, forwardRef(() => LeaveModule)],
  controllers: [ApprovalsController, ApprovalWorkflowsController],
  providers: [
    ApprovalWorkflowsService,
    ApprovalRequestsService,
    ApprovalActionsService,
    ApproverResolutionService,
    ApprovalEntityIntegrationService,
    PermissionsGuard,
  ],
  exports: [
    ApprovalWorkflowsService,
    ApprovalRequestsService,
    ApprovalActionsService,
    ApproverResolutionService,
  ],
})
export class ApprovalsModule {}
