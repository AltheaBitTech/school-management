import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;

  @IsString()
  @IsNotEmpty()
  FILE_STORAGE_ROOT!: string;
}

export const CONFIGURATION_KEY = 'app';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  fileStorageRoot: string;
  isProduction: boolean;
}

export default (): { [CONFIGURATION_KEY]: AppConfig } => ({
  [CONFIGURATION_KEY]: {
    nodeEnv: (process.env.NODE_ENV as NodeEnvironment) ?? NodeEnvironment.Development,
    port: parseInt(process.env.PORT ?? '3001', 10),
    databaseUrl: process.env.DATABASE_URL ?? '',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    fileStorageRoot: process.env.FILE_STORAGE_ROOT ?? 'storage/files',
    isProduction: process.env.NODE_ENV === NodeEnvironment.Production,
  },
});
