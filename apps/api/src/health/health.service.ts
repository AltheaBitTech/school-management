import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponseDto> {
    let databaseStatus: 'ok' | 'error' = 'ok';

    try {
      await this.prisma.ping();
    } catch {
      databaseStatus = 'error';
    }

    return {
      data: {
        status: databaseStatus === 'ok' ? 'ok' : 'degraded',
        checks: {
          database: databaseStatus,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
