import { RefreshRevokeReason } from '../constants/auth.constants';
import { RefreshSessionService } from './refresh-session.service';
import { TokenService } from './token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hashRefreshToken } from '../utils/token-hash.util';

describe('RefreshSessionService', () => {
  let refreshSessionService: RefreshSessionService;
  let prisma: {
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tokenService: jest.Mocked<Pick<TokenService, 'getRefreshTokenExpiresAt'>>;

  beforeEach(() => {
    prisma = {
      refreshSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    tokenService = {
      getRefreshTokenExpiresAt: jest
        .fn()
        .mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    };

    refreshSessionService = new RefreshSessionService(
      prisma as unknown as PrismaService,
      tokenService as unknown as TokenService,
    );
  });

  it('stores only hashed refresh tokens when creating a session', async () => {
    prisma.refreshSession.create.mockImplementation(async ({ data }) => ({
      id: 'session-1',
      ...data,
    }));

    const result = await refreshSessionService.createSession('user-1');

    expect(result.refreshToken).toBeDefined();
    expect(prisma.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: hashRefreshToken(result.refreshToken),
      }),
    });
    expect(prisma.refreshSession.create.mock.calls[0][0].data.tokenHash).not.toBe(
      result.refreshToken,
    );
  });

  it('revokes reused refresh tokens and all active sessions', async () => {
    const refreshToken = 'reused-token';
    prisma.refreshSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      revokedReason: RefreshRevokeReason.Rotated,
    });
    prisma.refreshSession.updateMany.mockResolvedValue({ count: 1 });

    await expect(refreshSessionService.rotateSession(refreshToken)).rejects.toThrow(
      'REFRESH_TOKEN_REUSED',
    );

    expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
      },
      data: expect.objectContaining({
        revokedReason: RefreshRevokeReason.ReuseDetected,
      }),
    });
  });
});
