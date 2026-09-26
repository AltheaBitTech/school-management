import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './constants/audit.constants';
import { sanitizeAuditValue } from './utils/audit-sanitizer';

describe('sanitizeAuditValue', () => {
  it('redacts sensitive top-level fields', () => {
    expect(
      sanitizeAuditValue({
        email: 'user@example.com',
        passwordHash: 'secret-hash',
        accessToken: 'token-value',
      }),
    ).toEqual({
      email: 'user@example.com',
      passwordHash: '[REDACTED]',
      accessToken: '[REDACTED]',
    });
  });

  it('redacts password reset token fields', () => {
    expect(
      sanitizeAuditValue({
        resetToken: 'raw-token',
        tokenHash: 'hashed-token',
      }),
    ).toEqual({
      resetToken: '[REDACTED]',
      tokenHash: '[REDACTED]',
    });
  });

  it('redacts nested sensitive fields', () => {
    expect(
      sanitizeAuditValue({
        user: {
          profile: {
            apiKey: 'abc123',
            name: 'Example',
          },
        },
      }),
    ).toEqual({
      user: {
        profile: {
          apiKey: '[REDACTED]',
          name: 'Example',
        },
      },
    });
  });
});

describe('AuditService', () => {
  const prisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as PrismaService;

  const auditService = new AuditService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('record creates an audit log with sanitized snapshots', async () => {
    await auditService.record({
      organizationId: 'org-1',
      actorUserId: 'actor-1',
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: 'user-1',
      requestId: 'req-1',
      metadata: {
        roleCode: 'SCHOOL_ADMIN',
        refreshToken: 'secret-token',
      },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        actorUserId: 'actor-1',
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: 'user-1',
        requestId: 'req-1',
        metadata: {
          roleCode: 'SCHOOL_ADMIN',
          refreshToken: '[REDACTED]',
        },
      },
    });
  });

  it('preserves trusted organizationId from server-side input', async () => {
    await auditService.record({
      organizationId: 'trusted-org-id',
      actorUserId: 'actor-1',
      action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: 'user-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'trusted-org-id',
        }),
      }),
    );
  });

  it('uses a transaction client when provided', async () => {
    const tx = {
      auditLog: {
        create: jest.fn(),
      },
    };

    await auditService.record(
      {
        organizationId: 'org-1',
        actorUserId: 'actor-1',
        action: AUDIT_ACTIONS.USER_ROLE_ASSIGNED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: 'user-1',
      },
      tx as never,
    );

    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
