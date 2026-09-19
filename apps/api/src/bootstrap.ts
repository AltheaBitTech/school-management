import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfig, CONFIGURATION_KEY } from './config/configuration';

/**
 * Builds and configures the Nest application without starting an HTTP listener, so the same
 * setup can be reused by the local `app.listen()` bootstrap (main.ts) and the Vercel serverless
 * handler (api/index.ts), which instead reads the underlying Express instance directly.
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

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
  // Swagger UI's bundled JS/CSS are served straight off disk at request time rather than
  // required, so Vercel's serverless function bundler never traces/includes them. Loading them
  // from a CDN (pinned to the installed swagger-ui-dist version) sidesteps that entirely.
  const swaggerUiVersion = '5.32.13';
  const swaggerCustomOptions: SwaggerCustomOptions = {
    customCssUrl: `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui.css`,
    customJs: [
      `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui-bundle.js`,
      `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${swaggerUiVersion}/swagger-ui-standalone-preset.js`,
    ],
  };
  SwaggerModule.setup('docs', app, document, swaggerCustomOptions);

  return app;
}
