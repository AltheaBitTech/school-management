import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let prisma: jest.Mocked<Pick<PrismaService, 'ping'>>;

  beforeEach(() => {
    prisma = {
      ping: jest.fn().mockResolvedValue(undefined),
    };
    healthService = new HealthService(prisma as unknown as PrismaService);
  });

  it('returns ok when database is reachable', async () => {
    const result = await healthService.check();

    expect(result.data.status).toBe('ok');
    expect(result.data.checks.database).toBe('ok');
    expect(result.meta.timestamp).toBeDefined();
    expect(prisma.ping).toHaveBeenCalledTimes(1);
  });
});
