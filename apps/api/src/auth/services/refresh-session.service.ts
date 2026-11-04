import { Injectable } from '@nestjs/common';
import { RefreshSession } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshRevokeReason } from '../constants/auth.constants';
import { generateRefreshToken, hashRefreshToken } from '../utils/token-hash.util';
import { TokenService } from './token.service';

export interface CreatedRefreshSession {
  session: RefreshSession;
  refreshToken: string;
}

export interface RefreshSessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async createSession(
    userId: string,
    metadata: RefreshSessionMetadata = {},
    activeRoleId?: string,
  ): Promise<CreatedRefreshSession> {
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);

    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
        activeRoleId: activeRoleId ?? null,
      },
    });

    return { session, refreshToken };
  }

  async rotateSession(
    currentToken: string,
    metadata: RefreshSessionMetadata = {},
  ): Promise<CreatedRefreshSession> {
    const tokenHash = hashRefreshToken(currentToken);
    const existingSession = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (!existingSession) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (existingSession.revokedAt) {
      await this.revokeAllActiveSessions(existingSession.userId, RefreshRevokeReason.ReuseDetected);
      throw new Error('REFRESH_TOKEN_REUSED');
    }

    if (existingSession.expiresAt <= new Date()) {
      await this.revokeSession(existingSession.id, RefreshRevokeReason.Expired);
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const refreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(refreshToken);

    const newSession = await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.update({
        where: { id: existingSession.id },
        data: {
          revokedAt: new Date(),
          revokedReason: RefreshRevokeReason.Rotated,
          lastUsedAt: new Date(),
        },
      });

      const createdSession = await tx.refreshSession.create({
        data: {
          userId: existingSession.userId,
          tokenHash: newTokenHash,
          expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          activeRoleId: existingSession.activeRoleId,
        },
      });

      await tx.refreshSession.update({
        where: { id: existingSession.id },
        data: {
          replacedBySessionId: createdSession.id,
        },
      });

      return createdSession;
    });

    return { session: newSession, refreshToken };
  }

  async revokeByToken(refreshToken: string, reason: RefreshRevokeReason): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.revokedAt) {
      return;
    }

    await this.revokeSession(session.id, reason);
  }

  async revokeAllActiveSessions(userId: string, reason: RefreshRevokeReason): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  async isSessionActive(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.findActiveSession(sessionId, userId);
    return session !== null;
  }

  async findActiveSession(sessionId: string, userId: string): Promise<RefreshSession | null> {
    return this.prisma.refreshSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  private async revokeSession(sessionId: string, reason: RefreshRevokeReason): Promise<void> {
    await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }
}
