import { IsNotEmpty, IsString } from 'class-validator';

export class EnvironmentAuthVariables {
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN!: string;
}

export const AUTH_CONFIG_KEY = 'auth';

export interface AuthConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export default (): { [AUTH_CONFIG_KEY]: AuthConfig } => ({
  [AUTH_CONFIG_KEY]: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
