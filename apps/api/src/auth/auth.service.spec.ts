import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { AUTH_ERROR_CODES, RefreshRevokeReason } from './constants/auth.constants';
import { PasswordService } from './services/password.service';
import { RefreshSessionService } from './services/refresh-session.service';
import { TokenService } from './services/token.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    userRole: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
    };
    refreshSession: {
      update: jest.Mock;
    };
    staff: { findFirst: jest.Mock };
    student: { findFirst: jest.Mock };
  };
  let passwordService: jest.Mocked<Pick<PasswordService, 'verify'>>;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      | 'createAccessToken'
      | 'createContextSelectionToken'
      | 'verifyAccessToken'
      | 'getAccessTokenExpiresInSeconds'
      | 'getRefreshTokenExpiresAt'
    >
  >;
  let refreshSessionService: jest.Mocked<
    Pick<
      RefreshSessionService,
      | 'createSession'
      | 'rotateSession'
      | 'revokeByToken'
      | 'revokeAllActiveSessions'
      | 'isSessionActive'
      | 'findActiveSession'
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

  const schoolAdminRole = {
    id: 'role-admin',
    organizationId: 'org-1',
    code: 'SCHOOL_ADMIN',
    name: 'School Admin',
    description: null,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const teacherRole = {
    ...schoolAdminRole,
    id: 'role-teacher',
    code: 'TEACHER',
    name: 'Teacher',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: schoolAdminRole }]),
        findFirst: jest.fn().mockResolvedValue({ role: schoolAdminRole }),
      },
      organization: {
        findUnique: jest.fn().mockResolvedValue({ code: 'greenwood-high' }),
      },
      refreshSession: {
        update: jest.fn(),
      },
      staff: { findFirst: jest.fn().mockResolvedValue(null) },
      student: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as typeof prisma;

    passwordService = {
      verify: jest.fn(),
    };

    tokenService = {
      createAccessToken: jest.fn().mockReturnValue('access-token'),
      createContextSelectionToken: jest.fn().mockReturnValue('selection-token'),
      verifyAccessToken: jest.fn(),
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
      findActiveSession: jest.fn(),
    };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      tokenService as unknown as TokenService,
      refreshSessionService as unknown as RefreshSessionService,
      { record: jest.fn() } as unknown as AuditService,
    );
  });

  it('logs in an active user with valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(activeUser);

    const result = await authService.login(
      {
        email: 'admin@school.example',
        password: 'StrongPassword123!',
      },
      {},
    );

    expect('accessToken' in result && result.accessToken).toBe('access-token');
    expect('refreshToken' in result && result.refreshToken).toBe('refresh-token');
    expect('user' in result && result.user.organizationId).toBe('org-1');
    expect('user' in result && result.user.activeRoleId).toBe('role-admin');
    expect(tokenService.createAccessToken).toHaveBeenCalledWith({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      sessionId: 'session-1',
      activeRoleId: 'role-admin',
      purpose: 'access',
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'admin@school.example',
        organization: {
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

  it('asks for a role when the account has more than one eligible role', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(activeUser);
    prisma.userRole.findMany.mockResolvedValue([{ role: schoolAdminRole }, { role: teacherRole }]);

    const result = await authService.login(
      {
        email: 'admin@school.example',
        password: 'StrongPassword123!',
      },
      {},
    );

    expect(result).toMatchObject({
      contextSelectionRequired: true,
      selectionToken: 'selection-token',
      roles: [
        { id: 'role-admin', code: 'SCHOOL_ADMIN', name: 'School Admin' },
        { id: 'role-teacher', code: 'TEACHER', name: 'Teacher' },
      ],
    });
    expect(refreshSessionService.createSession).not.toHaveBeenCalled();
  });

  it('shows Principal and Teacher after sign-in and starts a session for only the chosen role', async () => {
    const principalRole = {
      ...schoolAdminRole,
      id: 'role-principal',
      code: 'PRINCIPAL',
      name: 'Principal',
    };
    prisma.user.findFirst.mockResolvedValue(activeUser);
    passwordService.verify.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue(activeUser);
    prisma.userRole.findMany.mockResolvedValue([{ role: principalRole }, { role: teacherRole }]);

    const pending = await authService.login(
      { email: 'admin@school.example', password: 'StrongPassword123!' },
      {},
    );

    expect(pending).toMatchObject({
      contextSelectionRequired: true,
      roles: [
        { id: 'role-principal', code: 'PRINCIPAL', name: 'Principal' },
        { id: 'role-teacher', code: 'TEACHER', name: 'Teacher' },
      ],
    });
    expect(refreshSessionService.createSession).not.toHaveBeenCalled();

    tokenService.verifyAccessToken.mockReturnValue({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      purpose: 'context-selection',
    });
    prisma.userRole.findFirst.mockImplementation(async (args: { where: { roleId: string } }) => {
      if (args.where.roleId === 'role-teacher') {
        return { role: teacherRole };
      }
      if (args.where.roleId === 'role-principal') {
        return { role: principalRole };
      }
      return null;
    });

    const asTeacher = await authService.selectLoginContext('selection-token', 'role-teacher', {});
    expect(asTeacher.user.activeRoleId).toBe('role-teacher');
    expect(asTeacher.user.activeRoleCode).toBe('TEACHER');
    expect(asTeacher.user.activeRoleCode).not.toBe('PRINCIPAL');
    expect(refreshSessionService.createSession).toHaveBeenLastCalledWith(
      activeUser.id,
      {},
      'role-teacher',
    );

    const asPrincipal = await authService.selectLoginContext('selection-token', 'role-principal', {});
    expect(asPrincipal.user.activeRoleId).toBe('role-principal');
    expect(asPrincipal.user.activeRoleCode).toBe('PRINCIPAL');
    expect(refreshSessionService.createSession).toHaveBeenLastCalledWith(
      activeUser.id,
      {},
      'role-principal',
    );
  });

  it('rejects a login context role that is not assigned', async () => {
    tokenService.verifyAccessToken.mockReturnValue({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      purpose: 'context-selection',
    });
    prisma.user.findFirst.mockResolvedValue(activeUser);
    prisma.userRole.findFirst.mockResolvedValue(null);

    await expect(
      authService.selectLoginContext('selection-token', 'role-teacher', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: activeUser.id,
        organizationId: activeUser.organizationId,
        status: UserStatus.ACTIVE,
        organization: { status: OrganizationStatus.ACTIVE },
      },
    });
    expect(refreshSessionService.createSession).not.toHaveBeenCalled();
  });

  it('rejects context selection when the organization is not active', async () => {
    tokenService.verifyAccessToken.mockReturnValue({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      purpose: 'context-selection',
    });
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      authService.selectLoginContext('selection-token', 'role-admin', {}),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS },
    });
    expect(refreshSessionService.createSession).not.toHaveBeenCalled();
  });

  it('rejects an access token used as a context-selection token', async () => {
    tokenService.verifyAccessToken.mockReturnValue({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      sessionId: 'session-1',
      purpose: 'access',
    });

    await expect(
      authService.selectLoginContext('access-token', 'role-admin', {}),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS },
    });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rotates refresh tokens and keeps the active role', async () => {
    refreshSessionService.rotateSession.mockResolvedValue({
      session: {
        id: 'session-2',
        userId: activeUser.id,
        activeRoleId: 'role-admin',
      } as never,
      refreshToken: 'next-refresh-token',
    });
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const result = await authService.refresh('refresh-token', {});

    expect(result.refreshToken).toBe('next-refresh-token');
    expect(result.user.activeRoleId).toBe('role-admin');
    expect(tokenService.createAccessToken).toHaveBeenCalledWith({
      sub: activeUser.id,
      organizationId: activeUser.organizationId,
      sessionId: 'session-2',
      activeRoleId: 'role-admin',
      purpose: 'access',
    });
  });

  it('revokes the refreshed session when the active role is no longer assigned', async () => {
    refreshSessionService.rotateSession.mockResolvedValue({
      session: {
        id: 'session-2',
        userId: activeUser.id,
        activeRoleId: 'role-admin',
      } as never,
      refreshToken: 'next-refresh-token',
    });
    prisma.user.findUnique.mockResolvedValue(activeUser);
    prisma.userRole.findFirst.mockResolvedValue(null);

    await expect(authService.refresh('refresh-token', {})).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.ROLE_REVOKED },
    });
    expect(refreshSessionService.revokeByToken).toHaveBeenCalledWith(
      'next-refresh-token',
      RefreshRevokeReason.Expired,
    );
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
    refreshSessionService.findActiveSession.mockResolvedValue({
      id: 'session-1',
      userId: activeUser.id,
      activeRoleId: 'role-admin',
    } as never);

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
