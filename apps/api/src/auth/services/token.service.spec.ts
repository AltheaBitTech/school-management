import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AUTH_CONFIG_KEY } from '../../config/auth.configuration';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
      verify: jest.fn().mockReturnValue({
        sub: 'user-1',
        organizationId: 'org-1',
        sessionId: 'session-1',
      }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === AUTH_CONFIG_KEY) {
          return {
            accessSecret: 'test-secret',
            accessExpiresIn: '15m',
            refreshExpiresIn: '7d',
          };
        }

        return undefined;
      }),
    };

    tokenService = new TokenService(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('creates access tokens with authentication context claims', () => {
    const token = tokenService.createAccessToken({
      sub: 'user-1',
      organizationId: 'org-1',
      sessionId: 'session-1',
    });

    expect(token).toBe('signed-token');
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        sub: 'user-1',
        organizationId: 'org-1',
        sessionId: 'session-1',
      },
      {
        secret: 'test-secret',
        expiresIn: '15m',
      },
    );
  });

  it('verifies access tokens', () => {
    const payload = tokenService.verifyAccessToken('signed-token');

    expect(payload.organizationId).toBe('org-1');
    expect(jwtService.verify).toHaveBeenCalledWith('signed-token', {
      secret: 'test-secret',
    });
  });

  it('parses refresh token expiry durations', () => {
    expect(tokenService.getRefreshTokenExpiresInSeconds()).toBe(7 * 24 * 60 * 60);
    expect(tokenService.getAccessTokenExpiresInSeconds()).toBe(15 * 60);
  });
});
