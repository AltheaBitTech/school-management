import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import {
  FeeStructuresController,
  StudentFeeSummaryController,
  StudentFeesController,
} from './fees.controller';
import { FeeStructuresService } from './fee-structures.service';
import { StudentFeesService } from './student-fees.service';

@Module({
  imports: [AuthModule, PermissionsModule, AuditModule],
  controllers: [FeeStructuresController, StudentFeesController, StudentFeeSummaryController],
  providers: [FeeStructuresService, StudentFeesService, PermissionsGuard],
  exports: [FeeStructuresService, StudentFeesService],
})
export class FeesModule {}
