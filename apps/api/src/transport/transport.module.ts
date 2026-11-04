import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { TransportController, TransportReportsController } from './transport.controller';
import { TransportService } from './transport.service';

@Module({
  imports: [PermissionsModule],
  controllers: [TransportController, TransportReportsController],
  providers: [TransportService, PermissionsGuard],
  exports: [TransportService],
})
export class TransportModule {}
