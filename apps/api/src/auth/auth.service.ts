import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_ERROR_CODES, RefreshRevokeReason } from './constants/auth.constants';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './services/password.service';
import { RefreshSessionMetadata, RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { AuthenticatedUser } from './types/authenticated-user.types';
import { normalizeEmail } from './utils/email.util';

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly refreshSessionService: RefreshSessionService,
  ) {}

  async login(dto: LoginDto, metadata: RefreshSessionMetadata): Promise<AuthResult> {
    const user = await this.findLoginUser(dto.organizationCode, dto.email);

    if (!user || !user.passwordHash) {
      throw this.invalidCredentials();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.ACCOUNT_DISABLED,
        message: 'Account is disabled',
      });
    }

    const passwordValid = await this.passwordService.verify(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw this.invalidCredentials();
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueTokens(user, metadata);
  }

  async refresh(refreshToken: string, metadata: RefreshSessionMetadata): Promise<AuthResult> {
    try {
      const { session, refreshToken: nextRefreshToken } =
        await this.refreshSessionService.rotateSession(refreshToken, metadata);

      const user = await this.prisma.user.findUnique({
        where: { id: session.userId },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
          message: 'Invalid refresh token',
        });
      }

      return this.buildAuthResult(user, session.id, nextRefreshToken);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'REFRESH_TOKEN_REUSED') {
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.REFRESH_TOKEN_REUSED,
          message: 'Invalid refresh token',
        });
      }

      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
        message: 'Invalid refresh token',
      });
    }
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.refreshSessionService.revokeByToken(refreshToken, RefreshRevokeReason.Logout);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshSessionService.revokeAllActiveSessions(userId, RefreshRevokeReason.LogoutAll);
  }

  async getAuthenticatedUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Unauthorized',
      });
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      sessionId: '',
      email: user.email,
    };
  }

  async validateAccessSession(payload: {
    sub: string;
    organizationId: string;
    sessionId: string;
  }): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.organizationId,
        status: UserStatus.ACTIVE,
      },
    });

    if (!user) {
      return null;
    }

    const sessionActive = await this.refreshSessionService.isSessionActive(
      payload.sessionId,
      user.id,
    );

    if (!sessionActive) {
      return null;
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      sessionId: payload.sessionId,
      email: user.email,
    };
  }

  private async issueTokens(
    user: User,
    metadata: RefreshSessionMetadata,
  ): Promise<AuthResult> {
    const { session, refreshToken } = await this.refreshSessionService.createSession(
      user.id,
      metadata,
    );

    return this.buildAuthResult(user, session.id, refreshToken);
  }

  private buildAuthResult(user: User, sessionId: string, refreshToken: string): AuthResult {
    const accessToken = this.tokenService.createAccessToken({
      sub: user.id,
      organizationId: user.organizationId,
      sessionId,
    });

    return {
      accessToken,
      expiresIn: this.tokenService.getAccessTokenExpiresInSeconds(),
      refreshToken,
      user: {
        userId: user.id,
        organizationId: user.organizationId,
        sessionId,
        email: user.email,
      },
    };
  }

  private async findLoginUser(organizationCode: string, email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);
    const normalizedOrganizationCode = organizationCode.trim().toLowerCase();

    return this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        organization: {
          code: normalizedOrganizationCode,
          status: OrganizationStatus.ACTIVE,
        },
      },
    });
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      message: 'Invalid credentials',
    });
  }

  async completeSignup(registrationRequestId: string, password: string) {
    const registration = await this.prisma.organizationRegistrationRequest.findUnique({
      where: { id: registrationRequestId },
    });

    if (!registration || registration.status !== 'APPROVED') {
      throw new UnauthorizedException('Invalid or unapproved registration request');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: registration.contactEmail },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const passwordHash = await this.passwordService.hash(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    return { message: 'Signup completed. You can now log in.' };
  }
}
