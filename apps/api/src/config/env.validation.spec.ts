import 'reflect-metadata';
import { validateEnvironment } from './env.validation';

const baseConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/campusops',
  JWT_ACCESS_SECRET: 'test-secret-with-enough-length',
};

describe('validateEnvironment', () => {
  it('allows console email and local storage in development', () => {
    expect(
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'development',
        EMAIL_PROVIDER: 'console',
        STORAGE_PROVIDER: 'local',
      }),
    ).toMatchObject({ NODE_ENV: 'development' });
  });

  it('allows console email provider in production (interim until Resend is configured)', () => {
    expect(
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'console',
        STORAGE_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_STORAGE_BUCKET: 'private-files',
      }),
    ).toMatchObject({ NODE_ENV: 'production', EMAIL_PROVIDER: 'console' });
  });

  it('rejects local storage provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        RESEND_FROM_EMAIL: 'noreply@example.com',
        STORAGE_PROVIDER: 'local',
      }),
    ).toThrow(/STORAGE_PROVIDER must be "supabase"/);
  });

  it('accepts a display-name sender address', () => {
    expect(
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        RESEND_FROM_EMAIL: 'CampusOps <noreply@arogyix.altheabit.in>',
        STORAGE_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_STORAGE_BUCKET: 'private-files',
      }),
    ).toMatchObject({
      EMAIL_PROVIDER: 'resend',
      RESEND_FROM_EMAIL: 'CampusOps <noreply@arogyix.altheabit.in>',
    });
  });

  it('accepts resend email and supabase storage in production', () => {
    expect(
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 're_test',
        RESEND_FROM_EMAIL: 'noreply@example.com',
        STORAGE_PROVIDER: 'supabase',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        SUPABASE_STORAGE_BUCKET: 'private-files',
      }),
    ).toMatchObject({ NODE_ENV: 'production', EMAIL_PROVIDER: 'resend' });
  });
});
