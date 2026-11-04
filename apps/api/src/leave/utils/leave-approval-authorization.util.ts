import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/types/authenticated-user.types';
import { ORGANIZATION_ROLE_CODES } from '../../permissions/constants/system-roles';
import { LEAVE_ERROR_CODES } from '../constants/leave.constants';

type RoleLookupClient = {
  role: {
    findFirst(args: {
      where: { id: string; organizationId: string };
      select: { code: true };
    }): Promise<{ code: string } | null>;
  };
};

export async function assertPrincipalLeaveApprover(
  client: RoleLookupClient,
  actor: AuthenticatedUser,
): Promise<void> {
  if (!actor.activeRoleId) {
    throw new ForbiddenException({
      code: LEAVE_ERROR_CODES.LEAVE_APPROVAL_PRINCIPAL_ONLY,
      message: 'Only the Principal can approve or reject leave requests',
    });
  }

  const role = await client.role.findFirst({
    where: { id: actor.activeRoleId, organizationId: actor.organizationId },
    select: { code: true },
  });

  if (role?.code !== ORGANIZATION_ROLE_CODES.PRINCIPAL) {
    throw new ForbiddenException({
      code: LEAVE_ERROR_CODES.LEAVE_APPROVAL_PRINCIPAL_ONLY,
      message: 'Only the Principal can approve or reject leave requests',
    });
  }
}

export function isPrincipalRoleCode(roleCode: string | undefined): boolean {
  return roleCode === ORGANIZATION_ROLE_CODES.PRINCIPAL;
}
