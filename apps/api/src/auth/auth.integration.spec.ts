import { PrismaClient } from '@prisma/client';
import { PasswordService } from './services/password.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Auth integration', () => {
  let prisma: PrismaClient;
  let authService: AuthService;
  let organizationId: string;
  let userId: string;
  const organizationCode = `test-org-${Date.now()}`;
  const email = `auth-${Date.now()}@example.com`;
  const password = 'StrongPassword123!';

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const passwordService = new PasswordService();
    const configService = {
      get: (key: string) => {
        if (key === AUTH_CONFIG_KEY) {
          return {
            accessSecret: process.env.JWT_ACCESS_SECRET,
            accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
          };
        }

        return undefined;
      },
    };
    const jwtService = new JwtService({});
    const tokenService = new TokenService(
      jwtService,
      configService as unknown as ConfigService,
    );
    const refreshSessionService = new RefreshSessionService(
      prisma as unknown as PrismaService,
      tokenService,
    );
    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService,
      tokenService,
      refreshSessionService,
      new AuditService(prisma as unknown as PrismaService),
    );

    const organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        code: organizationCode,
      },
    });
    organizationId = organization.id;

    const passwordHash = await passwordService.hash(password);
    const user = await prisma.user.create({
      data: {
        organizationId,
        email,
        passwordHash,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.refreshSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  it('supports login, refresh rotation, and logout', async () => {
    const loginResult = await authService.login(
      {
        organizationCode,
        email,
        password,
      },
      {},
    );

    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.user.organizationId).toBe(organizationId);
    expect(loginResult.refreshToken).toBeDefined();

    const refreshResult = await authService.refresh(loginResult.refreshToken, {});
    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);

    await expect(authService.refresh(loginResult.refreshToken, {})).rejects.toBeDefined();

    await authService.logout(refreshResult.refreshToken);
    await expect(authService.refresh(refreshResult.refreshToken, {})).rejects.toBeDefined();
  });
});
