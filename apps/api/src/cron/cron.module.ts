import { Module } from '@nestjs/common';
import { NoticesModule } from '../notices/notices.module';
import { CronController } from './cron.controller';
import { CronSecretGuard } from './cron-secret.guard';

@Module({
  imports: [NoticesModule],
  controllers: [CronController],
  providers: [CronSecretGuard],
})
export class CronModule {}
