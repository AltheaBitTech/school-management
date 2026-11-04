import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { OrganizationStatus, Role, User, UserStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../audit/constants/audit.constants';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_ERROR_CODES, RefreshRevokeReason } from './constants/auth.constants';
import { PLATFORM_ORGANIZATION_CODE } from '../organizations/constants/organization.constants';
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

export interface LoginRoleOption {
  id: string;
  code: string;
  name: string;
}

export interface ContextSelectionRequired {
  contextSelectionRequired: true;
  selectionToken: string;
  expiresIn: number;
  roles: LoginRoleOption[];
}

export type LoginOutcome = AuthResult | ContextSelectionRequired;

export function isAuthenticatedLogin(result: LoginOutcome): result is AuthResult {
  return !('contextSelectionRequired' in result);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, metadata: RefreshSessionMetadata): Promise<LoginOutcome> {
    const user = await this.findLoginUser(dto.email);

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

    const roles = await this.listEligibleRoles(user.id, user.organizationId);

    if (roles.length === 0) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.NO_ASSIGNED_ROLE,
        message: 'You do not have an assigned role',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    if (roles.length === 1) {
      return this.issueTokens(user, metadata, roles[0]);
    }

    return {
      contextSelectionRequired: true,
      selectionToken: this.tokenService.createContextSelectionToken({
        sub: user.id,
        organizationId: user.organizationId,
      }),
      expiresIn: 5 * 60,
      roles: roles.map((role) => ({ id: role.id, code: role.code, name: role.name })),
    };
  }

  async selectLoginContext(
    selectionToken: string,
    roleId: string,
    metadata: RefreshSessionMetadata,
  ): Promise<AuthResult> {
    let payload: { sub?: string; organizationId?: string; purpose?: string };

    try {
      payload = this.tokenService.verifyAccessToken(selectionToken);
    } catch {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    if (payload.purpose !== 'context-selection' || !payload.sub || !payload.organizationId) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.organizationId,
        status: UserStatus.ACTIVE,
        organization: {
          status: OrganizationStatus.ACTIVE,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    const role = await this.findAssignedRole(user.id, user.organizationId, roleId);

    if (!role) {
      throw new ForbiddenException({
        code: AUTH_ERROR_CODES.ROLE_NOT_ASSIGNED,
        message: 'You do not have permission to perform this action',
      });
    }

    return this.issueTokens(user, metadata, role);
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

      const role = await this.resolveSessionRole(user.id, user.organizationId, session.activeRoleId);

      if (!role) {
        await this.refreshSessionService.revokeByToken(
          nextRefreshToken,
          RefreshRevokeReason.Expired,
        );
        throw new UnauthorizedException({
          code: AUTH_ERROR_CODES.ROLE_REVOKED,
          message: 'Invalid refresh token',
        });
      }

      if (session.activeRoleId !== role.id) {
        await this.prisma.refreshSession.update({
          where: { id: session.id },
          data: { activeRoleId: role.id },
        });
      }

      return this.buildAuthResult(user, session.id, nextRefreshToken, role);
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

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

  async getUserSessionProfile(
    userId: string,
    organizationId: string,
    activeRoleId?: string,
  ): Promise<{
    staff?: { firstName: string; lastName: string; displayName: string | null };
    role?: { name: string; code: string };
    studentId?: string;
  }> {
    const [staff, student, roleAssignment] = await Promise.all([
      this.prisma.staff.findFirst({
        where: { userId, organizationId },
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
        },
      }),
      this.prisma.student.findFirst({
        where: { userId, organizationId },
        select: { id: true },
      }),
      activeRoleId
        ? this.prisma.userRole.findFirst({
            where: { userId, roleId: activeRoleId },
            include: {
              role: {
                select: {
                  name: true,
                  code: true,
                  organizationId: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      ...(staff
        ? {
            staff: {
              firstName: staff.firstName,
              lastName: staff.lastName,
              displayName: staff.displayName,
            },
          }
        : {}),
      ...(roleAssignment?.role &&
      (roleAssignment.role.organizationId === null ||
        roleAssignment.role.organizationId === organizationId)
        ? {
            role: {
              name: roleAssignment.role.name,
              code: roleAssignment.role.code,
            },
          }
        : {}),
      ...(student ? { studentId: student.id } : {}),
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

    const session = await this.refreshSessionService.findActiveSession(
      payload.sessionId,
      user.id,
    );

    if (!session) {
      return null;
    }

    const role = await this.resolveSessionRole(user.id, user.organizationId, session.activeRoleId);

    if (!role) {
      return null;
    }

    return {
      userId: user.id,
      organizationId: user.organizationId,
      sessionId: payload.sessionId,
      email: user.email,
      activeRoleId: role.id,
      activeRoleCode: role.code,
    };
  }

  private async issueTokens(
    user: User,
    metadata: RefreshSessionMetadata,
    role: Role,
  ): Promise<AuthResult> {
    const { session, refreshToken } = await this.refreshSessionService.createSession(
      user.id,
      metadata,
      role.id,
    );

    const result = this.buildAuthResult(user, session.id, refreshToken, role);

    await this.auditService.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.USER_LOGGED_IN,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      metadata: {
        activeRoleId: role.id,
        activeRoleCode: role.code,
      },
    });

    return result;
  }

  private buildAuthResult(
    user: User,
    sessionId: string,
    refreshToken: string,
    role: Role,
  ): AuthResult {
    const accessToken = this.tokenService.createAccessToken({
      sub: user.id,
      organizationId: user.organizationId,
      sessionId,
      activeRoleId: role.id,
      purpose: 'access',
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
        activeRoleId: role.id,
        activeRoleCode: role.code,
      },
    };
  }

  private async listEligibleRoles(userId: string, organizationId: string): Promise<Role[]> {
    const [assignments, platformOrganization] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { userId },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.isPlatformOrganization(organizationId),
    ]);

    return assignments
      .map((assignment) => assignment.role)
      .filter((role) => this.isEligibleRole(role.organizationId, organizationId, platformOrganization));
  }

  private async findAssignedRole(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<Role | null> {
    const [assignment, platformOrganization] = await Promise.all([
      this.prisma.userRole.findFirst({
        where: { userId, roleId },
        include: { role: true },
      }),
      this.isPlatformOrganization(organizationId),
    ]);

    if (
      !assignment ||
      !this.isEligibleRole(assignment.role.organizationId, organizationId, platformOrganization)
    ) {
      return null;
    }

    return assignment.role;
  }

  private async resolveSessionRole(
    userId: string,
    organizationId: string,
    activeRoleId: string | null,
  ): Promise<Role | null> {
    if (activeRoleId) {
      return this.findAssignedRole(userId, organizationId, activeRoleId);
    }

    const roles = await this.listEligibleRoles(userId, organizationId);
    return roles.length === 1 ? roles[0] : null;
  }

  private async isPlatformOrganization(organizationId: string): Promise<boolean> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { code: true },
    });

    return organization?.code === PLATFORM_ORGANIZATION_CODE;
  }

  private isEligibleRole(
    roleOrganizationId: string | null,
    userOrganizationId: string,
    platformOrganization: boolean,
  ): boolean {
    if (roleOrganizationId === null) {
      return platformOrganization;
    }

    return roleOrganizationId === userOrganizationId;
  }

  private async findLoginUser(email: string): Promise<User | null> {
    const normalizedEmail = normalizeEmail(email);

    return this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        organization: {
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
      include: {
        organization: true,
      },
    });

    if (!registration || registration.status !== 'APPROVED' || !registration.organizationId) {
      throw new UnauthorizedException('Invalid or unapproved registration request');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: registration.contactEmail,
        organizationId: registration.organizationId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.passwordHash) {
      throw new ConflictException({
        code: 'SIGNUP_ALREADY_COMPLETED',
        message: 'Signup has already been completed for this registration',
      });
    }

    const passwordHash = await this.passwordService.hash(password);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    await this.auditService.record({
      organizationId: registration.organizationId,
      actorUserId: user.id,
      action: AUDIT_ACTIONS.ORGANIZATION_SIGNUP_COMPLETED,
      entityType: AUDIT_ENTITY_TYPES.ORGANIZATION_REGISTRATION_REQUEST,
      entityId: registrationRequestId,
      metadata: {
        email: user.email,
        organizationCode: registration.organization?.code,
      },
    });

    return {
      message: 'Signup completed. You can now log in.',
      organizationCode: registration.organization?.code ?? null,
    };
  }
}
