import { Module } from '@nestjs/common';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PermissionsModule } from '../permissions/permissions.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PermissionsModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, PermissionsGuard],
  exports: [OnboardingService],
})
export class OnboardingModule {}
