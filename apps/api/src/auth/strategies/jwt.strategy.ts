import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../config/auth.configuration';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../types/authenticated-user.types';
import { AccessTokenPayload } from '../types/jwt-payload.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const authConfig = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!authConfig) {
      throw new Error('Authentication configuration is unavailable');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.accessSecret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.purpose === 'context-selection' || !payload.sessionId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    }

    const user = await this.authService.validateAccessSession({
      ...payload,
      sessionId: payload.sessionId,
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    }

    return user;
  }
}
