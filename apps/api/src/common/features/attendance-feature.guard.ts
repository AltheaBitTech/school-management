import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FEATURE_ERROR_CODES } from './feature.constants';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class AttendanceFeatureGuard implements CanActivate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  canActivate(_context: ExecutionContext): boolean {
    if (this.featureFlagsService.isAttendanceEnabled()) {
      return true;
    }

    throw new ForbiddenException({
      code: FEATURE_ERROR_CODES.FEATURE_DISABLED,
      message: 'Attendance is disabled for this deployment',
    });
  }
}
