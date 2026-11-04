import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationStatus, User, UserStatus } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AUDIT_ACTIONS } from '../../audit/constants/audit.constants';
import { EmailProvider } from '../../notifications/providers/email-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUTH_ERROR_CODES,
  PASSWORD_RESET_GENERIC_MESSAGE,
  RefreshRevokeReason,
} from '../constants/auth.constants';
import { PasswordService } from './password.service';
import { PasswordResetService } from './password-reset.service';
import { RefreshSessionService } from './refresh-session.service';
import { hashRefreshToken } from '../utils/token-hash.util';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: {
    user: { findFirst: jest.Mock };
    organization: { findUnique: jest.Mock };
    $transaction: jest.Mock;
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let passwordService: jest.Mocked<Pick<PasswordService, 'hash'>>;
  let refreshSessionService: jest.Mocked<Pick<RefreshSessionService, 'revokeAllActiveSessions'>>;
  let auditService: jest.Mocked<Pick<AuditService, 'record'>>;
  let emailProvider: jest.Mocked<EmailProvider>;
  let configService: Pick<ConfigService, 'get'>;

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

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn() },
      organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Test School' }) },
      $transaction: jest.fn(async (callback) =>
        callback({
          passwordResetToken: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 'token-1' }),
            findUnique: jest.fn(),
          },
          user: {
            update: jest.fn().mockResolvedValue(activeUser),
          },
        }),
      ),
      passwordResetToken: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    passwordService = { hash: jest.fn().mockResolvedValue('$argon2id$new') };
    refreshSessionService = { revokeAllActiveSessions: jest.fn().mockResolvedValue(undefined) };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    emailProvider = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    configService = {
      get: jest.fn().mockReturnValue({ corsOrigin: 'http://localhost:3000' }),
    };

    service = new PasswordResetService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      refreshSessionService as unknown as RefreshSessionService,
      auditService as unknown as AuditService,
      configService as ConfigService,
      emailProvider,
    );
  });

  it('returns generic response for unknown email', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.requestPasswordReset({
      email: 'missing@example.com',
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(emailProvider.sendEmail).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('creates reset token and sends email for eligible user', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);

    const result = await service.requestPasswordReset({
      email: activeUser.email,
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(emailProvider.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: activeUser.email,
        subject: expect.stringContaining('Reset your CampusOps password'),
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        entityId: activeUser.id,
      }),
    );
  });

  it('still returns generic response when email provider fails', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    emailProvider.sendEmail.mockRejectedValue(new Error('provider down'));

    const result = await service.requestPasswordReset({
      email: activeUser.email,
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_MESSAGE);
    expect(auditService.record).toHaveBeenCalled();
  });

  it('resets password, revokes sessions, and audits completion', async () => {
    const rawToken = 'reset-token-value';
    const tokenHash = hashRefreshToken(rawToken);

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'token-1',
            userId: activeUser.id,
            organizationId: activeUser.organizationId,
            tokenHash,
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            user: activeUser,
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: {
          update: jest.fn().mockResolvedValue(activeUser),
        },
      }),
    );

    const result = await service.resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    });

    expect(result.message).toContain('reset successfully');
    expect(passwordService.hash).toHaveBeenCalledWith('NewPassword123!');
    expect(refreshSessionService.revokeAllActiveSessions).toHaveBeenCalledWith(
      activeUser.id,
      RefreshRevokeReason.PasswordReset,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
        entityId: activeUser.id,
      }),
    );
  });

  it('ignores text glued onto the reset token by a log line', async () => {
    const rawToken = 'reset-token-value';
    const tokenHash = hashRefreshToken(rawToken);
    const findUnique = jest.fn().mockResolvedValue({
      id: 'token-1',
      userId: activeUser.id,
      organizationId: activeUser.organizationId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: activeUser,
    });

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique,
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: {
          update: jest.fn().mockResolvedValue(activeUser),
        },
      }),
    );

    await service.resetPassword({
      token: `${rawToken}\\n\\nThis`,
      newPassword: 'NewPassword123!',
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { tokenHash },
      include: { user: true },
    });
  });

  it('sets initial password for invite users without an existing password hash', async () => {
    const rawToken = 'invite-token-value';
    const tokenHash = hashRefreshToken(rawToken);
    const inviteUser: User = { ...activeUser, passwordHash: null };

    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'token-2',
            userId: inviteUser.id,
            organizationId: inviteUser.organizationId,
            tokenHash,
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            user: inviteUser,
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        user: {
          update: jest.fn().mockResolvedValue({ ...inviteUser, passwordHash: '$argon2id$new' }),
        },
      }),
    );

    await service.resetPassword({
      token: rawToken,
      newPassword: 'NewPassword123!',
    });

    expect(passwordService.hash).toHaveBeenCalledWith('NewPassword123!');
  });

  it('rejects invalid reset token', async () => {
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue(null),
          updateMany: jest.fn(),
        },
        user: { update: jest.fn() },
      }),
    );

    await expect(
      service.resetPassword({ token: 'invalid', newPassword: 'NewPassword123!' }),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.INVALID_RESET_TOKEN },
    });
  });

  it('rejects expired reset token', async () => {
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'token-1',
            userId: activeUser.id,
            organizationId: activeUser.organizationId,
            tokenHash: hashRefreshToken('expired'),
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
            user: activeUser,
          }),
          updateMany: jest.fn(),
        },
        user: { update: jest.fn() },
      }),
    );

    await expect(
      service.resetPassword({ token: 'expired', newPassword: 'NewPassword123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects concurrent token reuse', async () => {
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'token-1',
            userId: activeUser.id,
            organizationId: activeUser.organizationId,
            tokenHash: hashRefreshToken('once'),
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
            user: activeUser,
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        user: { update: jest.fn() },
      }),
    );

    await expect(
      service.resetPassword({ token: 'once', newPassword: 'NewPassword123!' }),
    ).rejects.toMatchObject({
      response: { code: AUTH_ERROR_CODES.INVALID_RESET_TOKEN },
    });
  });

  it('matches active users in active organizations including pending first-time password setup', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await service.requestPasswordReset({ email: 'x@example.com' });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: 'x@example.com',
        status: UserStatus.ACTIVE,
        organization: {
          status: OrganizationStatus.ACTIVE,
        },
      },
    });
  });
});
