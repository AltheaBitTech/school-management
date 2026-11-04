import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import authConfiguration from './auth.configuration';
import configuration from './configuration';
import emailConfiguration from './email.configuration';
import featuresConfiguration from './features.configuration';
import storageConfiguration from './storage.configuration';
import { validateEnvironment } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, authConfiguration, emailConfiguration, storageConfiguration, featuresConfiguration],
      validate: validateEnvironment,
    }),
  ],
})
export class AppConfigModule {}
