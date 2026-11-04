import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS } from '../audit/constants/audit.constants';
import { CONFIGURATION_KEY } from '../config/configuration';
import { EmailProvider } from '../notifications/providers/email-provider.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PASSWORD_RESET_GENERIC_MESSAGE } from './constants/auth.constants';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { JwtService } from '@nestjs/jwt';
import { AUTH_CONFIG_KEY } from '../config/auth.configuration';
import { hashRefreshToken } from './utils/token-hash.util';

const describeIfDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeIfDatabase('Password reset integration', () => {
  let prisma: PrismaClient;
  let passwordResetService: PasswordResetService;
  let authService: AuthService;
  let organizationId: string;
  let userId: string;
  let roleId: string;
  let organizationCode: string;
  let email: string;
  let originalPassword: string;
  let lastEmailText: string | undefined;

  const emailProvider: EmailProvider = {
    sendEmail: async (input) => {
      lastEmailText = input.text;
    },
  };

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
        if (key === CONFIGURATION_KEY) {
          return { corsOrigin: 'http://localhost:3000' };
        }
        return undefined;
      },
    };
    const jwtService = new JwtService({});
    const tokenService = new TokenService(jwtService, configService as unknown as ConfigService);
    const refreshSessionService = new RefreshSessionService(
      prisma as unknown as PrismaService,
      tokenService,
    );
    const auditService = new AuditService(prisma as unknown as PrismaService);

    passwordResetService = new PasswordResetService(
      prisma as unknown as PrismaService,
      passwordService,
      refreshSessionService,
      auditService,
      configService as unknown as ConfigService,
      emailProvider,
    );
    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService,
      tokenService,
      refreshSessionService,
      auditService,
    );

    organizationCode = `reset-org-${Date.now()}`;
    email = `reset-${Date.now()}@example.com`;
    originalPassword = 'OriginalPassword123!';

    const organization = await prisma.organization.create({
      data: {
        name: 'Password Reset School',
        code: organizationCode,
      },
    });
    organizationId = organization.id;

    const passwordHash = await passwordService.hash(originalPassword);
    const user = await prisma.user.create({
      data: {
        organizationId,
        email,
        passwordHash,
      },
    });
    userId = user.id;

    const role = await prisma.role.create({
      data: {
        organizationId,
        code: 'SCHOOL_ADMIN',
        name: 'School Admin',
      },
    });
    roleId = role.id;
    await prisma.userRole.create({
      data: { userId, roleId },
    });
  });

  afterAll(async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.refreshSession.deleteMany({ where: { userId } });
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.userRole.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.role.deleteMany({ where: { id: roleId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.$disconnect();
  });

  function extractTokenFromEmail(text: string | undefined): string {
    const match = text?.match(/token=([^&\s]+)/);
    if (!match?.[1]) {
      throw new Error('Reset token not found in email');
    }
    return match[1];
  }

  it('returns the same generic response for unknown email', async () => {
    const known = await passwordResetService.requestPasswordReset({
      email,
    });
    const unknown = await passwordResetService.requestPasswordReset({
      email: `unknown-${Date.now()}@example.com`,
    });

    expect(known.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(unknown.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
  });

  it('supports forgot password, reset password, and login with new password', async () => {
    lastEmailText = undefined;
    await passwordResetService.requestPasswordReset({ email });
    const token = extractTokenFromEmail(lastEmailText);

    const loginBeforeReset = await authService.login(
      { email, password: originalPassword },
      {},
    );
    if (!('accessToken' in loginBeforeReset)) {
      throw new Error('Expected a single-role login session');
    }
    expect(loginBeforeReset.accessToken).toBeDefined();

    const resetResult = await passwordResetService.resetPassword({
      token,
      newPassword: 'UpdatedPassword123!',
    });
    expect(resetResult.message).toContain('reset successfully');

    await expect(
      authService.refresh(loginBeforeReset.refreshToken, {}),
    ).rejects.toBeDefined();

    await expect(
      authService.login({ email, password: originalPassword }, {}),
    ).rejects.toBeDefined();

    const loginAfterReset = await authService.login(
      { email, password: 'UpdatedPassword123!' },
      {},
    );
    if (!('accessToken' in loginAfterReset)) {
      throw new Error('Expected a single-role login session');
    }
    expect(loginAfterReset.accessToken).toBeDefined();

    await expect(
      passwordResetService.resetPassword({ token, newPassword: 'AnotherPassword123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: {
          in: [AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED, AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED],
        },
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects invalid and expired tokens', async () => {
    await expect(
      passwordResetService.resetPassword({
        token: 'not-a-real-token',
        newPassword: 'UpdatedPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const expiredRawToken = 'expired-reset-token';
    await prisma.passwordResetToken.create({
      data: {
        userId,
        organizationId,
        tokenHash: hashRefreshToken(expiredRawToken),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await expect(
      passwordResetService.resetPassword({
        token: expiredRawToken,
        newPassword: 'UpdatedPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
