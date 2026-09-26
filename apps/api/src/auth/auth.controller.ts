import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AppConfig, CONFIGURATION_KEY } from '../config/configuration';
import { AuthService } from './auth.service';
import { AUTH_ERROR_CODES, REFRESH_COOKIE_NAME } from './constants/auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CompleteSignupDto } from './dto/complete-signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetMessageResponseDto } from './dto/password-reset-message-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrganizationsService } from '../organizations/organizations.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PasswordResetService } from './services/password-reset.service';
import { RefreshSessionMetadata } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { AuthenticatedUser } from './types/authenticated-user.types';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from './utils/cookie.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
    private readonly organizationsService: OrganizationsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate with organization code, email, and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto, this.extractMetadata(request));

    setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.tokenService.getRefreshTokenExpiresInSeconds(),
      this.isProduction(),
    );

    return {
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: {
          id: result.user.userId,
          email: result.user.email,
          organizationId: result.user.organizationId,
        },
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = this.readRefreshToken(request);
    const result = await this.authService.refresh(refreshToken, this.extractMetadata(request));

    setRefreshTokenCookie(
      response,
      result.refreshToken,
      this.tokenService.getRefreshTokenExpiresInSeconds(),
      this.isProduction(),
    );

    return {
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        user: {
          id: result.user.userId,
          email: result.user.email,
          organizationId: result.user.organizationId,
        },
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = this.readRefreshToken(request);
    await this.authService.logout(refreshToken);
    clearRefreshTokenCookie(response, this.isProduction());
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all refresh sessions for the authenticated user' })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logoutAll(user.userId);
    clearRefreshTokenCookie(response, this.isProduction());
  }

  @Post('complete-signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Complete signup for approved registration (set password)' })
  async completeSignup(@Body() body: CompleteSignupDto) {
    return this.authService.completeSignup(body.registrationRequestId, body.password);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiOkResponse({ type: PasswordResetMessageResponseDto })
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<PasswordResetMessageResponseDto> {
    return this.passwordResetService.requestPasswordReset(body);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password using a valid reset token' })
  @ApiOkResponse({ type: PasswordResetMessageResponseDto })
  async resetPassword(@Body() body: ResetPasswordDto): Promise<PasswordResetMessageResponseDto> {
    return this.passwordResetService.resetPassword(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user context' })
  @ApiOkResponse({ type: MeResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    const authenticatedUser = await this.authService.getAuthenticatedUser(user.userId);
    const organization = await this.organizationsService.getOrganizationForAuthenticatedUser(
      user.organizationId,
    );

    const permissions = await this.permissionsService.getEffectivePermissions(
      user.userId,
      user.organizationId,
    );

    return {
      data: {
        id: authenticatedUser.userId,
        email: authenticatedUser.email,
        organizationId: authenticatedUser.organizationId,
        organization: this.organizationsService.toOrganizationSummary(organization),
        permissions,
      },
    };
  }

  private readRefreshToken(request: Request): string {
    const cookieValue = request.cookies?.[REFRESH_COOKIE_NAME];

    if (typeof cookieValue !== 'string' || cookieValue.length === 0) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
        message: 'Invalid refresh token',
      });
    }

    return cookieValue;
  }

  private extractMetadata(request: Request): RefreshSessionMetadata {
    return {
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    };
  }

  private isProduction(): boolean {
    return this.configService.get<AppConfig>(CONFIGURATION_KEY)?.isProduction ?? false;
  }
}
