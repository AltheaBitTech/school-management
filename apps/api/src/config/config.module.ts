import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import authConfiguration from './auth.configuration';
import configuration from './configuration';
import { validateEnvironment } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, authConfiguration],
      validate: validateEnvironment,
    }),
  ],
})
export class AppConfigModule {}
