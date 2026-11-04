import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FEATURES_CONFIG_KEY, FeaturesConfig } from '../../config/features.configuration';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly configService: ConfigService) {}

  isAttendanceEnabled(): boolean {
    return this.configService.get<FeaturesConfig>(FEATURES_CONFIG_KEY)?.attendanceEnabled ?? true;
  }

  toPublicSnapshot(): { attendanceEnabled: boolean } {
    return { attendanceEnabled: this.isAttendanceEnabled() };
  }
}
