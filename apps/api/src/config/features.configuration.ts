export const FEATURES_CONFIG_KEY = 'features';

export interface FeaturesConfig {
  attendanceEnabled: boolean;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
}

export default (): { [FEATURES_CONFIG_KEY]: FeaturesConfig } => ({
  [FEATURES_CONFIG_KEY]: {
    attendanceEnabled: parseBooleanEnv(process.env.FEATURE_ATTENDANCE_ENABLED, true),
  },
});
