import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentAuthVariables } from './auth.configuration';
import { EnvironmentEmailVariables } from './email.configuration';
import { EnvironmentVariables } from './configuration';

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = {
    NODE_ENV: config.NODE_ENV ?? 'development',
    PORT: config.PORT ?? '3001',
    DATABASE_URL: config.DATABASE_URL,
    CORS_ORIGIN: config.CORS_ORIGIN ?? 'http://localhost:3000',
    FILE_STORAGE_ROOT: config.FILE_STORAGE_ROOT ?? 'storage/files',
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? '7d',
    EMAIL_PROVIDER: config.EMAIL_PROVIDER ?? 'console',
    RESEND_API_KEY: config.RESEND_API_KEY,
    RESEND_FROM_EMAIL: config.RESEND_FROM_EMAIL,
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
  ];

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Environment validation failed: ${messages}`);
  }

  return normalized;
}
