import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export enum StorageProviderType {
  Local = 'local',
  Supabase = 'supabase',
}

export class EnvironmentStorageVariables {
  @IsEnum(StorageProviderType)
  STORAGE_PROVIDER: StorageProviderType = StorageProviderType.Local;

  @ValidateIf(
    (values: EnvironmentStorageVariables) => values.STORAGE_PROVIDER === StorageProviderType.Supabase,
  )
  @IsString()
  @IsNotEmpty()
  SUPABASE_URL?: string;

  @ValidateIf(
    (values: EnvironmentStorageVariables) => values.STORAGE_PROVIDER === StorageProviderType.Supabase,
  )
  @IsString()
  @IsNotEmpty()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @ValidateIf(
    (values: EnvironmentStorageVariables) => values.STORAGE_PROVIDER === StorageProviderType.Supabase,
  )
  @IsString()
  @IsNotEmpty()
  SUPABASE_STORAGE_BUCKET?: string;
}

export const STORAGE_CONFIG_KEY = 'storage';

export interface StorageConfig {
  provider: StorageProviderType;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseBucket?: string;
}

export default (): { [STORAGE_CONFIG_KEY]: StorageConfig } => {
  const provider =
    process.env.STORAGE_PROVIDER === StorageProviderType.Supabase
      ? StorageProviderType.Supabase
      : StorageProviderType.Local;

  return {
    [STORAGE_CONFIG_KEY]: {
      provider,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET,
    },
  };
};
