import { describe, expect, it, afterEach } from 'vitest';
import {
  isAttendanceEnabled,
  readEnvAttendanceEnabled,
  resetFeatureFlagsCacheForTests,
  setFeatureFlagsFromSession,
} from './feature-flags';

describe('feature flags', () => {
  afterEach(() => {
    resetFeatureFlagsCacheForTests();
    delete process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE_ENABLED;
  });

  it('defaults attendance to enabled when env is unset', () => {
    expect(readEnvAttendanceEnabled()).toBe(true);
    expect(isAttendanceEnabled()).toBe(true);
  });

  it('respects session-provided flags over env defaults', () => {
    process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE_ENABLED = 'true';
    setFeatureFlagsFromSession({ attendanceEnabled: false });
    expect(isAttendanceEnabled()).toBe(false);
  });
});
