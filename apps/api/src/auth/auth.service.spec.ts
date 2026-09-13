import { UnauthorizedException } from '@nestjs/common';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { AUTH_ERROR_CODES, RefreshRevokeReason } from './constants/auth.constants';
import { PasswordService } from './services/password.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let passwordService: jest.Mocked<Pick<PasswordService, 'verify'>>;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      'createAccessToken' | 'getAccessTokenExpiresInSeconds' | 'getRefreshTokenExpiresAt'
    >
  >;
  let refreshSessionService: jest.Mocked<
    Pick<
      RefreshSessionService,
      'createSession' | 'rotateSession' | 'revokeByToken' | 'revokeAllActiveSessions' | 'isSessionActive'
    >
  >;

  const activeUser: User = {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'admin@school.example',
    passwordHash: '$argon2id$hash',
    status: UserStatus.ACTIVE,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as typeof prisma;

    passwordService = {
      verify: jest.fn(),
    };

    tokenService = {
      createAccessToken: jest.fn().mockReturnValue('access-token'),
      getAccessTokenExpiresInSeconds: jest.fn().mockReturnValue(900),
      getRefreshTokenExpiresAt: jest.fn().mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    };

    refreshSessionService = {
      createSession: jest.fn().mockResolvedValue({
        session: { id: 'session-1' },
        refreshToken: 'refresh-token',
      }),
      rotateSession: jest.fn(),
      revokeByToken: jest.fn(),
      revokeAllActiveSessions: jest.fn(),
      isSessionActive: jest.fn(),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      refreshSessionService as unknown as RefreshSessionService,
    );
  });

  it('logs in an active user with valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(activeUser);

    const result = await authService.login(
      {
        organizationCode: 'greenwood-high',
        email: 'admin@school.example',
        password: 'StrongPassword123!',
      },
      {},
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.organizationId).toBe('org-1');
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'admin@school.example',
        organization: {
          code: 'greenwood-high',
          status: OrganizationStatus.ACTIVE,
        },
      },
    });
  });

  it('rejects invalid passwords with a generic error', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      authService.login(
        {
          organizationCode: 'greenwood-high',
          email: 'admin@school.example',
          password: 'WrongPassword123!',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: {
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      },
    });
  });

  it('rejects unknown accounts with a generic error', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      authService.login(
        {
          organizationCode: 'greenwood-high',
          email: 'missing@school.example',
          password: 'StrongPassword123!',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects disabled accounts', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...activeUser,
      status: UserStatus.DISABLED,
    });

    await expect(
      authService.login(
        {
          organizationCode: 'greenwood-high',
          email: 'admin@school.example',
          password: 'StrongPassword123!',
        },
        {},
      ),
    ).rejects.toMatchObject({
      response: {
        code: AUTH_ERROR_CODES.ACCOUNT_DISABLED,
      },
    });
  });

  it('rotates refresh tokens on refresh', async () => {
    refreshSessionService.rotateSession.mockResolvedValue({
      session: { id: 'session-2', userId: activeUser.id } as never,
      refreshToken: 'next-refresh-token',
    });
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const result = await authService.refresh('refresh-token', {});

    expect(result.refreshToken).toBe('next-refresh-token');
    expect(tokenService.createAccessToken).toHaveBeenCalledWith({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      sessionId: 'session-2',
    });
  });

  it('revokes refresh sessions on logout', async () => {
    await authService.logout('refresh-token');

    expect(refreshSessionService.revokeByToken).toHaveBeenCalledWith(
      'refresh-token',
      RefreshRevokeReason.Logout,
    );
  });

  it('derives organization context from the authenticated user record', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    refreshSessionService.isSessionActive.mockResolvedValue(true);

    const user = await authService.validateAccessSession({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      sessionId: 'session-1',
    });

    expect(user?.organizationId).toBe('org-1');
  });

  it('rejects access tokens when organization context does not match the user record', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const user = await authService.validateAccessSession({
      sub: activeUser.id,
      organizationId: 'other-org',
      sessionId: 'session-1',
    });

    expect(user).toBeNull();
  });
});
