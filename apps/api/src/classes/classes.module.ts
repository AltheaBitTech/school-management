import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [forwardRef(() => AuthModule), PermissionsModule],
  controllers: [ClassesController],
  providers: [ClassesService, PermissionsGuard],
  exports: [ClassesService],
})
export class ClassesModule {}
