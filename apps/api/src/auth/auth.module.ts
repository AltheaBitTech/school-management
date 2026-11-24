import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AUTH_CONFIG_KEY, AuthConfig } from '../config/auth.configuration';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccountInviteService } from './services/account-invite.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    AuditModule,
    NotificationsModule,
    forwardRef(() => OrganizationsModule),
    PermissionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

        if (!authConfig) {
          throw new Error('Authentication configuration is unavailable');
        }

        return {
          secret: authConfig.accessSecret,
          signOptions: {
            expiresIn: authConfig.accessExpiresIn as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountInviteService,
    PasswordResetService,
    PasswordService,
    TokenService,
    RefreshSessionService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    AccountInviteService,
    PasswordService,
    JwtAuthGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
