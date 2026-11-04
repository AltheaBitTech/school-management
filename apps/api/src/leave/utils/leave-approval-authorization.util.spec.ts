import { ForbiddenException } from '@nestjs/common';
import { assertPrincipalLeaveApprover } from './leave-approval-authorization.util';
import { ORGANIZATION_ROLE_CODES } from '../../permissions/constants/system-roles';

describe('assertPrincipalLeaveApprover', () => {
  const organizationId = 'org-1';

  it('allows an active Principal role', async () => {
    const client = {
      role: {
        findFirst: jest.fn().mockResolvedValue({ code: ORGANIZATION_ROLE_CODES.PRINCIPAL }),
      },
    };

    await expect(
      assertPrincipalLeaveApprover(client, {
        userId: 'user-1',
        organizationId,
        sessionId: 'session-1',
        email: 'principal@example.com',
        activeRoleId: 'role-principal',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects School Admin even if they retain stale leave permissions in the database', async () => {
    const client = {
      role: {
        findFirst: jest.fn().mockResolvedValue({ code: ORGANIZATION_ROLE_CODES.SCHOOL_ADMIN }),
      },
    };

    await expect(
      assertPrincipalLeaveApprover(client, {
        userId: 'user-2',
        organizationId,
        sessionId: 'session-2',
        email: 'admin@example.com',
        activeRoleId: 'role-admin',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
