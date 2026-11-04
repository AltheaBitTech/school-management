import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { TransportModule } from '../transport/transport.module';
import { ParentSelfController } from './parent-self.controller';
import { ParentSelfService } from './parent-self.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule, TransportModule],
  controllers: [ParentSelfController],
  providers: [ParentSelfService, PermissionsGuard],
})
export class ParentSelfModule {}