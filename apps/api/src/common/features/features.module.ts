import { Global, Module } from '@nestjs/common';
import { AttendanceFeatureGuard } from './attendance-feature.guard';
import { FeatureFlagsService } from './feature-flags.service';

@Global()
@Module({
  providers: [FeatureFlagsService, AttendanceFeatureGuard],
  exports: [FeatureFlagsService, AttendanceFeatureGuard],
})
export class FeaturesModule {}
