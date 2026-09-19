import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createApp } from './bootstrap';
import { AppConfig, CONFIGURATION_KEY } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  app.enableShutdownHooks();

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>(CONFIGURATION_KEY);

  if (!appConfig) {
    throw new Error('Application configuration is unavailable');
  }

  await app.listen(appConfig.port);

  logger.log(`CampusOps API listening on port ${appConfig.port}`);
  logger.log(`Swagger available at http://localhost:${appConfig.port}/docs`);
  logger.log(`Health check available at http://localhost:${appConfig.port}/api/v1/health`);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  const message = error instanceof Error ? error.message : 'Failed to start application';
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(message, stack);
  console.error(message, stack);
  process.exit(1);
});
