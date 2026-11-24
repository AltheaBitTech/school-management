import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentAuthVariables } from './auth.configuration';
import { EnvironmentEmailVariables } from './email.configuration';
import { EnvironmentStorageVariables } from './storage.configuration';
import { EnvironmentVariables } from './configuration';

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = {
    NODE_ENV: config.NODE_ENV ?? 'development',
    PORT: config.PORT ?? '3001',
    DATABASE_URL: config.DATABASE_URL,
    CORS_ORIGIN: config.CORS_ORIGIN ?? 'http://localhost:3000',
    FILE_STORAGE_ROOT: config.FILE_STORAGE_ROOT ?? 'storage/files',
    CRON_SECRET: config.CRON_SECRET,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? '7d',
    EMAIL_PROVIDER: config.EMAIL_PROVIDER ?? 'console',
    RESEND_API_KEY: config.RESEND_API_KEY,
    RESEND_FROM_EMAIL: config.RESEND_FROM_EMAIL,
    EMAIL_REPLY_TO: config.EMAIL_REPLY_TO,
    FRONTEND_URL: config.FRONTEND_URL,
    STORAGE_PROVIDER: config.STORAGE_PROVIDER ?? 'local',
    SUPABASE_URL: config.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: config.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: config.SUPABASE_STORAGE_BUCKET,
    FEATURE_ATTENDANCE_ENABLED: config.FEATURE_ATTENDANCE_ENABLED,
  };

  const validated = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });

  const authValidated = plainToInstance(EnvironmentAuthVariables, normalized, {
    enableImplicitConversion: true,
  });

  const emailValidated = plainToInstance(EnvironmentEmailVariables, normalized, {
    enableImplicitConversion: true,
  });

  const storageValidated = plainToInstance(EnvironmentStorageVariables, normalized, {
    enableImplicitConversion: true,
  });

  const errors = [
    ...validateSync(validated, {
      skipMissingProperties: false,
    }),
    ...validateSync(authValidated, {
      skipMissingProperties: false,
    }),
    ...validateSync(emailValidated, {
      skipMissingProperties: false,
    }),
    ...validateSync(storageValidated, {
      skipMissingProperties: false,
    }),
  ];

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  assertProductionProviderConfiguration(normalized);

  return normalized;
}

function assertProductionProviderConfiguration(normalized: Record<string, unknown>): void {
  if (normalized.NODE_ENV !== 'production') {
    return;
  }

  if (normalized.STORAGE_PROVIDER === 'local') {
    throw new Error(
      'Environment validation failed: STORAGE_PROVIDER must be "supabase" when NODE_ENV is production',
    );
  }
}
