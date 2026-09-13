import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import {
  LeaveBalancesController,
  LeaveRequestsController,
  LeaveTypesController,
} from './leave.controller';
import { LeaveBalancesService } from './leave-balances.service';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveTypesService } from './leave-types.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [LeaveTypesController, LeaveBalancesController, LeaveRequestsController],
  providers: [
    LeaveTypesService,
    LeaveBalancesService,
    LeaveRequestsService,
    PermissionsGuard,
  ],
  exports: [LeaveTypesService, LeaveBalancesService, LeaveRequestsService],
})
export class LeaveModule {}
