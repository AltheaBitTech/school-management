import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfig, CONFIGURATION_KEY } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>(CONFIGURATION_KEY);

  if (!appConfig) {
    throw new Error('Application configuration is unavailable');
  }

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: appConfig.corsOrigin,
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CampusOps API')
    .setDescription('School Operations Management SaaS API')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

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
