import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { FEATURES_CONFIG_KEY, FeaturesConfig } from '../../config/features.configuration';
import { AttendanceFeatureGuard } from './attendance-feature.guard';
import { FeatureFlagsService } from './feature-flags.service';

describe('AttendanceFeatureGuard', () => {
  it('blocks attendance routes when the feature flag is disabled', () => {
    const configService = {
      get: (key: string) =>
        key === FEATURES_CONFIG_KEY ? ({ attendanceEnabled: false } satisfies FeaturesConfig) : undefined,
    } as unknown as ConfigService;
    const guard = new AttendanceFeatureGuard(new FeatureFlagsService(configService));

    expect(() => guard.canActivate({} as ExecutionContext)).toThrow(ForbiddenException);
  });

  it('allows attendance routes when enabled', () => {
    const configService = {
      get: (key: string) =>
        key === FEATURES_CONFIG_KEY ? ({ attendanceEnabled: true } satisfies FeaturesConfig) : undefined,
    } as unknown as ConfigService;
    const guard = new AttendanceFeatureGuard(new FeatureFlagsService(configService));

    expect(guard.canActivate({} as ExecutionContext)).toBe(true);
  });
});
