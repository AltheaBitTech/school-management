import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../config/auth.configuration';
import { AccessTokenPayload } from '../types/jwt-payload.types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(payload: AccessTokenPayload): string {
    const authConfig = this.getAuthConfig();

    return this.jwtService.sign(
      { ...payload, purpose: payload.purpose ?? 'access' },
      {
        secret: authConfig.accessSecret,
        expiresIn: authConfig.accessExpiresIn as JwtSignOptions['expiresIn'],
      },
    );
  }

  createContextSelectionToken(payload: { sub: string; organizationId: string }): string {
    const authConfig = this.getAuthConfig();

    return this.jwtService.sign(
      {
        sub: payload.sub,
        organizationId: payload.organizationId,
        purpose: 'context-selection',
      },
      {
        secret: authConfig.accessSecret,
        expiresIn: '5m',
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const authConfig = this.getAuthConfig();

    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: authConfig.accessSecret,
    });
  }

  getAccessTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(this.getAuthConfig().accessExpiresIn);
  }

  getRefreshTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(this.getAuthConfig().refreshExpiresIn);
  }

  getRefreshTokenExpiresAt(): Date {
    const seconds = this.parseDurationToSeconds(this.getAuthConfig().refreshExpiresIn);
    return new Date(Date.now() + seconds * 1000);
  }

  private getAuthConfig(): AuthConfig {
    const authConfig = this.configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!authConfig) {
      throw new Error('Authentication configuration is unavailable');
    }

    return authConfig;
  }

  private parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());

    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        throw new Error(`Unsupported duration unit: ${unit}`);
    }
  }
}
