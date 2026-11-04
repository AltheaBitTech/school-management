import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoticesService } from '../notices/notices.service';
import { CronSecretGuard } from './cron-secret.guard';

@ApiTags('cron')
@Controller('cron')
export class CronController {
  constructor(private readonly noticesService: NoticesService) {}

  @Get('publish-scheduled-notices')
  @UseGuards(CronSecretGuard)
  @ApiOperation({
    summary: 'Publish due scheduled notices (Vercel Cron — no Redis/BullMQ)',
  })
  async publishScheduledNotices() {
    const result = await this.noticesService.publishDueScheduledNotices();
    return { data: result };
  }
}
