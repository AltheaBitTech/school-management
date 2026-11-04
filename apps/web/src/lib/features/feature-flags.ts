export interface FeatureFlagsSnapshot {
  attendanceEnabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlagsSnapshot = {
  attendanceEnabled: true,
};

let cachedFlags: FeatureFlagsSnapshot | null = null;

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function readEnvAttendanceEnabled(): boolean {
  return parseBooleanEnv(process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE_ENABLED, true);
}

export function setFeatureFlagsFromSession(flags: FeatureFlagsSnapshot | undefined): void {
  cachedFlags = flags ? { ...flags } : null;
}

export function getFeatureFlags(): FeatureFlagsSnapshot {
  if (cachedFlags) {
    return cachedFlags;
  }

  return {
    attendanceEnabled: readEnvAttendanceEnabled(),
  };
}

export function isAttendanceEnabled(): boolean {
  return getFeatureFlags().attendanceEnabled;
}

export function resetFeatureFlagsCacheForTests(): void {
  cachedFlags = null;
}

export { DEFAULT_FLAGS };
